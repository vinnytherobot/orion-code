import { AppError, type Result, fail, ok } from '@orion/shared';
import type { ProjectAnalyzer, ProjectSnapshot } from './ProjectAnalyzer.js';
import type { AgentExecutor } from './AgentExecutor.js';
import { IntentClassifier, type Intent } from './IntentClassifier.js';
import { AgentSelector } from './AgentSelector.js';
import { DagBuilder } from './DagBuilder.js';
import { PlanCache } from './PlanCache.js';
import { ComplexityAssessor } from './ComplexityAssessor.js';

export interface PlannedSubtask {
  /** Stable id within the plan (used to wire dependencies). */
  localId: string;
  title: string;
  description: string;
  role: string;
  /** Local ids of other subtasks this one depends on. */
  dependencies: string[];
  estimatedComplexity: number;
}

export interface PlannerResult {
  projectSnapshot: ProjectSnapshot;
  subtasks: PlannedSubtask[];
}

export interface RouteInput {
  rootPath: string;
  request: string;
}

const VALID_ROLES = new Set([
  'architect',
  'backend',
  'database',
  'frontend',
  'documentation',
  'qa',
  'reviewer',
  'devops',
  'security',
  'performance',
  'git',
]);

interface LlmSubtask {
  title?: string;
  description?: string;
  role?: string;
  dependencies?: number[] | string[];
  estimated_complexity?: number;
  estimatedComplexity?: number;
}

interface LlmPlan {
  subtasks?: LlmSubtask[];
}

const PLANNER_SYSTEM_PROMPT = [
  'You are the Planner Agent inside Orion, a multi-agent software-engineering system.',
  'You NEVER write code. You only decompose a high-level request into a',
  'dependency-ordered set of subtasks for specialist agents.',
  '',
  'Available agent roles and when to assign them:',
  '  architect       — folder structure, boundaries, conventions (NO code).',
  '  backend         — TypeScript / DDD business logic, services, use cases.',
  '  database        — schemas, migrations, indexes, query tuning.',
  '  frontend        — UI components, styles, hooks.',
  '  documentation   — README, OpenAPI specs, ADRs.',
  '  qa              — unit / integration / e2e tests, run the suite.',
  '  reviewer        — read-only review of the worktree, verdict JSON.',
  '  devops          — Docker, CI, infrastructure.',
  '  security        — read-only security audit, reports findings.',
  '  performance     — read-only perf audit, slow queries, hot paths.',
  '  git             — commit messages, branches, merging.',
  '',
  'Rules:',
  '1. Produce 4-8 subtasks (more if the request is genuinely complex,',
  '   fewer if the request is trivial).',
  '2. Each subtask MUST have: title, description, role, dependencies (by',
  '   local INDEX in the plan, 0-based), estimated_complexity (1-5).',
  '3. Dependencies MUST form a DAG — no cycles.',
  '4. Always start with an architect subtask (deps = []) so the others',
  '   have a convention to follow, unless the request is trivial.',
  '5. If the request involves persistence, add a database subtask.',
  '6. If the request involves user-visible behavior, add a qa subtask',
  '   AFTER the implementation subtasks.',
  '7. Always end with a reviewer subtask whose dependencies include',
  '   every implementation subtask.',
  '8. If the request is trivial (creating a single file, writing a comment,',
  '   renaming something), produce exactly 1 subtask with no dependencies.',
  '   Do NOT add architect/reviewer for trivial tasks.',
  '9. Output STRICT JSON. No prose, no markdown fences around it.',
].join('\n');

// Intent-to-default-role mapping
const INTENT_DEFAULT_ROLE: Record<Intent, string> = {
  'add-feature': 'backend',
  'fix-bug': 'backend',
  'refactor': 'backend',
  'add-infrastructure': 'devops',
  'add-testing': 'qa',
  'security-audit': 'security',
  'performance': 'performance',
  'unknown': 'backend',
};

/**
 * Decomposes a high-level request into a dependency-ordered task plan.
 *
 * Uses a three-tier strategy:
 *   1. Trivial: Single-agent path, no decomposition needed.
 *   2. Moderate: selectDynamic with complexity filtering, 2-3 focused agents.
 *   3. Complex: Full multi-agent pipeline (or LLM fallback for unknown intents).
 */
export class PlannerService {
  constructor(
    private readonly analyzer: ProjectAnalyzer,
    private readonly agentExecutor: AgentExecutor,
    private readonly intentClassifier: IntentClassifier = new IntentClassifier(),
    private readonly agentSelector: AgentSelector = new AgentSelector(),
    private readonly dagBuilder: DagBuilder = new DagBuilder(),
    private readonly planCache: PlanCache = new PlanCache(),
    private readonly complexityAssessor: ComplexityAssessor = new ComplexityAssessor(),
  ) {}

  /**
   * Main entry point. Routes through fast path first, falls back to LLM.
   */
  async plan(input: { rootPath: string; request: string }): Promise<Result<PlannerResult, AppError>> {
    return this.route(input);
  }

  /**
   * Routes a user request through the three-tier planner.
   */
  async route(input: RouteInput): Promise<Result<PlannerResult, AppError>> {
    const snapshot = this.analyzer.analyze(input.rootPath);

    // 1. Classify intent (async with LLM fallback)
    const classification = await this.intentClassifier.classifyAsync(input.request);
    if (classification.isFail()) {
      return fail(classification.error);
    }
    const intent = classification.value.intent;

    // 2. Check cache
    const cacheKey = this.buildCacheKey(intent, input.request);
    const cached = this.planCache.get(cacheKey);
    if (cached) {
      return ok({ projectSnapshot: snapshot, subtasks: cached });
    }

    // 3. Assess complexity
    const assessment = this.complexityAssessor.assess({ request: input.request, intent });

    // 4a. TRIVIAL: single-task plan, no multi-agent decomposition
    if (assessment.tier === 'trivial') {
      const role = assessment.suggestedRoles[0] ?? INTENT_DEFAULT_ROLE[intent] ?? 'backend';
      const title = this.generateTrivialTitle(input.request);
      const subtasks = this.dagBuilder.buildSingleTask({
        title,
        description: input.request,
        role,
      });
      this.planCache.set(cacheKey, subtasks);
      return ok({ projectSnapshot: snapshot, subtasks });
    }

    // 4b. MODERATE: use selectDynamic with complexity filtering
    if (assessment.tier === 'moderate') {
      const ranked = this.agentSelector.selectDynamic({
        intent,
        taskComplexity: assessment.score,
        request: input.request,
      });
      const agents = ranked.map(r => r.role);

      if (agents.length > 0) {
        const subtasks = this.dagBuilder.buildWithContext(agents, {
          request: input.request,
          intent,
          complexity: assessment.score,
        });
        this.planCache.set(cacheKey, subtasks);
        return ok({ projectSnapshot: snapshot, subtasks });
      }
    }

    // 4c. COMPLEX: use existing logic (may include LLM fallback)
    const agents = this.agentSelector.select(intent);
    if (agents.length > 0) {
      const subtasks = this.dagBuilder.buildWithContext(agents, {
        request: input.request,
        intent,
        complexity: assessment.score,
      });
      this.planCache.set(cacheKey, subtasks);
      return ok({ projectSnapshot: snapshot, subtasks });
    }

    // 5. LLM fallback for unknown/ambiguous requests
    return this.llmFallback(input, snapshot);
  }

  private generateTrivialTitle(request: string): string {
    return request
      .replace(/\b(a|an|the|called|named|in|at|for|to)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, c => c.toUpperCase());
  }

  private async llmFallback(
    input: RouteInput,
    snapshot: ProjectSnapshot,
  ): Promise<Result<PlannerResult, AppError>> {
    const projectContext = this.analyzer.describe(snapshot);

    const userPrompt = [
      'Project context (already analyzed):',
      projectContext,
      '',
      'User request:',
      input.request.trim(),
      '',
      'Output STRICT JSON of the form:',
      '{ "subtasks": [ { "title", "description", "role", "dependencies": [0, 1], "estimated_complexity": 1-5 } ] }',
    ].join('\n');

    const planResult = await this.agentExecutor.chatStructured<LlmPlan>({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt,
      retries: 3,
    });

    if (planResult.isFail()) {
      return fail(planResult.error);
    }

    const subtasks = this.normalizeLlmSubtasks(planResult.value.subtasks ?? []);
    if (subtasks.isFail()) {
      return fail(subtasks.error);
    }

    return ok({ projectSnapshot: snapshot, subtasks: subtasks.value });
  }

  /**
   * Validates and normalizes LLM output into PlannedSubtask[].
   * Handles both index-based and string-based dependency references.
   */
  private normalizeLlmSubtasks(raw: LlmSubtask[]): Result<PlannedSubtask[], AppError> {
    if (raw.length === 0) {
      return fail(AppError.validation('Planner returned no subtasks'));
    }

    const out: PlannedSubtask[] = [];

    // First pass: validate and assign local IDs
    for (const [idx, row] of raw.entries()) {
      const title = String(row.title ?? '').trim();
      const description = String(row.description ?? '').trim();
      const role = String(row.role ?? '').trim();
      const complexity = Number(row.estimated_complexity ?? row.estimatedComplexity ?? 1);

      if (!title) return fail(AppError.validation(`Subtask #${idx} missing title`));
      if (!description) return fail(AppError.validation(`Subtask "${title}" missing description`));
      if (!VALID_ROLES.has(role)) return fail(AppError.validation(`Subtask "${title}" has invalid role: ${role}`));
      if (!Number.isFinite(complexity) || complexity < 1 || complexity > 5) {
        return fail(AppError.validation(`Subtask "${title}" has invalid estimated_complexity: ${complexity}`));
      }

      const localId = `${idx}-${role}`;
      out.push({ localId, title, description, role, dependencies: [], estimatedComplexity: complexity });
    }

    // Second pass: wire dependencies
    for (const [idx, row] of raw.entries()) {
      const deps = Array.isArray(row.dependencies) ? row.dependencies : [];
      const mapped: string[] = [];
      for (const dep of deps) {
        const depIdx = typeof dep === 'number' ? dep : Number.parseInt(String(dep), 10);
        if (!Number.isFinite(depIdx)) {
          return fail(AppError.validation(`Subtask #${idx} has non-numeric dependency "${dep}"`));
        }
        if (depIdx === idx) {
          return fail(AppError.validation(`Subtask #${idx} depends on itself`));
        }
        if (depIdx < 0 || depIdx >= raw.length) {
          return fail(AppError.validation(`Subtask #${idx} depends on missing index ${depIdx}`));
        }
        const target = out[depIdx];
        if (!target) {
          return fail(AppError.validation(`Subtask #${idx} depends on missing index ${depIdx}`));
        }
        mapped.push(target.localId);
      }
      const row_ = out[idx];
      if (!row_) {
        return fail(AppError.validation(`Internal: missing subtask at index ${idx}`));
      }
      row_.dependencies = mapped;
    }

    // Cycle check via topological sort (Kahn's algorithm)
    if (this.hasCycle(out)) {
      return fail(AppError.validation('Planner produced a plan with a dependency cycle'));
    }

    return ok(out);
  }

  private buildCacheKey(intent: Intent, request: string): string {
    const keywords = request
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .sort()
      .slice(0, 5)
      .join(',');
    return `${intent}:${keywords}`;
  }

  private hasCycle(plan: PlannedSubtask[]): boolean {
    const inDegree = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const node of plan) {
      inDegree.set(node.localId, node.dependencies.length);
      for (const dep of node.dependencies) {
        const list = children.get(dep) ?? [];
        list.push(node.localId);
        children.set(dep, list);
      }
    }

    const queue = plan.filter((n) => (inDegree.get(n.localId) ?? 0) === 0).map((n) => n.localId);
    let visited = 0;
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      visited++;
      for (const child of children.get(id) ?? []) {
        const next = (inDegree.get(child) ?? 0) - 1;
        inDegree.set(child, next);
        if (next === 0) queue.push(child);
      }
    }
    return visited !== plan.length;
  }
}
