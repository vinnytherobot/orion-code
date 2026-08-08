import { AppError, type Result, fail, ok } from '@orion/shared';
import type { ProjectAnalyzer, ProjectSnapshot } from './ProjectAnalyzer.js';
import type { AgentExecutor } from './AgentExecutor.js';

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
  '8. Output STRICT JSON. No prose, no markdown fences around it.',
].join('\n');

/**
 * Decomposes a high-level request into a dependency-ordered task plan
 * using the configured LLM. The plan is grounded by the
 * `ProjectAnalyzer` snapshot so the LLM knows the existing stack.
 *
 * The result is a `PlannerResult` (NOT persisted yet — the orchestrator
 * is responsible for turning `subtasks` into `Task` rows with proper
 * dependency wiring).
 */
export class PlannerService {
  constructor(
    private readonly analyzer: ProjectAnalyzer,
    private readonly agentExecutor: AgentExecutor,
  ) {}

  async plan(input: { rootPath: string; request: string }): Promise<Result<PlannerResult, AppError>> {
    const snapshot = this.analyzer.analyze(input.rootPath);
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

    const normalized = this.normalize(planResult.value.subtasks ?? []);
    if (normalized.isFail()) {
      return fail(normalized.error);
    }
    return ok({
      projectSnapshot: snapshot,
      subtasks: normalized.value,
    });
  }

  private normalize(
    raw: LlmSubtask[],
  ): Result<PlannedSubtask[], AppError> {
    if (raw.length === 0) {
      return fail(AppError.validation('Planner returned no subtasks'));
    }

    const allowedRoles = [...VALID_ROLES];
    const seenIds = new Set<string>();
    const out: PlannedSubtask[] = [];

    // First pass: validate each row and assign a local id.
    raw.forEach((row, idx) => {
      const title = String(row.title ?? '').trim();
      const description = String(row.description ?? '').trim();
      const role = String(row.role ?? '').trim();
      const complexity = Number(row.estimated_complexity ?? row.estimatedComplexity ?? 1);

      if (!title) {
        throw new Error(`Subtask #${idx} missing title`);
      }
      if (!description) {
        throw new Error(`Subtask "${title}" missing description`);
      }
      if (!VALID_ROLES.has(role)) {
        throw new Error(`Subtask "${title}" has invalid role: ${role}. Allowed: ${allowedRoles.join(', ')}`);
      }
      if (!Number.isFinite(complexity) || complexity < 1 || complexity > 5) {
        throw new Error(`Subtask "${title}" has invalid estimated_complexity: ${complexity}`);
      }

      // Local id is the index prefix + role slug to be human-readable.
      const localId = `${idx}-${role}`;
      if (seenIds.has(localId)) {
        throw new Error(`Duplicate local id ${localId}`);
      }
      seenIds.add(localId);

      out.push({
        localId,
        title,
        description,
        role,
        dependencies: [],
        estimatedComplexity: complexity,
      });
    });

    // Second pass: wire dependencies. The LLM returns indices, and our
    // local ids map to those indices.
    raw.forEach((row, idx) => {
      const deps = Array.isArray(row.dependencies) ? row.dependencies : [];
      const mapped: string[] = [];
      for (const dep of deps) {
        const depIdx = typeof dep === 'number' ? dep : Number.parseInt(String(dep), 10);
        if (!Number.isFinite(depIdx)) {
          throw new Error(`Subtask #${idx} has non-numeric dependency "${dep}"`);
        }
        if (depIdx === idx) {
          throw new Error(`Subtask #${idx} depends on itself`);
        }
        const target = out[depIdx];
        if (!target) {
          throw new Error(`Subtask #${idx} depends on missing index ${depIdx}`);
        }
        mapped.push(target.localId);
      }
      const row_ = out[idx];
      if (!row_) {
        throw new Error(`Internal: missing subtask at index ${idx}`);
      }
      row_.dependencies = mapped;
    });

    // Cycle check. We do a simple DFS since the graph is small.
    if (this.hasCycle(out)) {
      return fail(AppError.validation('Planner produced a plan with a dependency cycle'));
    }

    return ok(out);
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
