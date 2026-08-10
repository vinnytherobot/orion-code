import { AppError, type Result, fail, ok } from '@orion/shared';
import type { ProjectAnalyzer, ProjectSnapshot } from './ProjectAnalyzer.js';
import type { AgentExecutor } from './AgentExecutor.js';
import { IntentClassifier, type Intent } from './IntentClassifier.js';
import { AgentSelector } from './AgentSelector.js';
import { DagBuilder, type PlannedSubtask } from './DagBuilder.js';
import { PlanCache } from './PlanCache.js';

export interface PlannerResult {
  projectSnapshot: ProjectSnapshot;
  subtasks: PlannedSubtask[];
}

export interface RouteInput {
  rootPath: string;
  request: string;
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
  '8. Output STRICT JSON. No prose, no markdown fences around it.',
].join('\n');

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

export class TechLeadRouter {
  constructor(
    private readonly analyzer: ProjectAnalyzer,
    private readonly agentExecutor: AgentExecutor,
    private readonly intentClassifier: IntentClassifier = new IntentClassifier(),
    private readonly agentSelector: AgentSelector = new AgentSelector(),
    private readonly dagBuilder: DagBuilder = new DagBuilder(),
    private readonly planCache: PlanCache = new PlanCache(),
  ) {}

  async route(input: RouteInput): Promise<Result<PlannerResult, AppError>> {
    const snapshot = this.analyzer.analyze(input.rootPath);

    // 1. Classify intent
    const intent = this.intentClassifier.classify(input.request);

    // 2. Check cache
    const cacheKey = this.buildCacheKey(intent, input.request);
    const cached = this.planCache.get(cacheKey);
    if (cached) {
      return ok({ projectSnapshot: snapshot, subtasks: cached });
    }

    // 3. Select agents
    const agents = this.agentSelector.select(intent);

    // 4. If no agents selected, use LLM fallback
    if (agents.length === 0) {
      return this.llmFallback(input, snapshot);
    }

    // 5. Build DAG
    const subtasks = this.dagBuilder.build(agents);

    // 6. Cache the plan
    this.planCache.set(cacheKey, subtasks);

    return ok({ projectSnapshot: snapshot, subtasks });
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

  private normalizeLlmSubtasks(raw: LlmSubtask[]): Result<PlannedSubtask[], AppError> {
    if (raw.length === 0) {
      return fail(AppError.validation('Planner returned no subtasks'));
    }

    const VALID_ROLES = new Set([
      'architect', 'backend', 'database', 'frontend', 'documentation',
      'qa', 'reviewer', 'devops', 'security', 'performance', 'git',
    ]);

    const out: PlannedSubtask[] = [];

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

    // Wire dependencies
    for (const [idx, row] of raw.entries()) {
      const deps = Array.isArray(row.dependencies) ? row.dependencies : [];
      const mapped: string[] = [];
      for (const dep of deps) {
        const depIdx = typeof dep === 'number' ? dep : Number.parseInt(String(dep), 10);
        if (!Number.isFinite(depIdx) || depIdx === idx) continue;
        const target = out[depIdx];
        if (target) mapped.push(target.localId);
      }
      const row_ = out[idx];
      if (!row_) {
        return fail(AppError.validation(`Internal: missing subtask at index ${idx}`));
      }
      row_.dependencies = mapped;
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
}
