import { AppError, type Result, fail } from '@orion/shared';
import type { Agent } from '@orion/domain';
import type { LockManager } from '../orchestration/LockManager.js';

/**
 * Context passed to every tool invocation. Provides the worktree the
 * agent operates in, the lock manager for path-level serialization, and
 * the agent record so tools can enforce permissions.
 */
export interface ToolContext {
  agent: Agent;
  worktreePath: string;
  /** Lock manager used to serialize writes per-path. */
  lockManager: LockManager;
  /** When set, the tool run is abortable (e.g. on orchestrator timeout). */
  signal?: AbortSignal;
}

/** Result returned by every tool. Plain values for JSON-serializability. */
export type ToolRunResult = Result<Record<string, unknown>, AppError>;

/**
 * A tool is a function an agent can call during its tool-use loop. It
 * declares a JSON-schema-ish shape for its inputs (so the LLM can be
 * told what's available) and an async `run` method.
 */
export interface Tool {
  readonly name: string;
  readonly description: string;
  /** Maps to the OpenAI/Anthropic/Ollama tool-call format. */
  readonly inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Path prefixes the agent must have on its `permissions` list. */
  readonly requiresPermission?: string | string[];
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolRunResult>;
}

/**
 * Registry of tools available to an agent. Centralizes permission
 * enforcement so individual tools don't have to reimplement it.
 *
 * Permission model: an agent's `permissions` are path prefixes (e.g.
 * `src/`, `docker/`). When a tool resolves a target path, the registry
 * checks whether the agent's permissions include that prefix. Empty
 * `permissions` means "no filesystem access" (e.g. the Reviewer Agent
 * in the existing seed grants `src/`, but a hypothetical
 * ReadOnlyInspector with empty `permissions` cannot read anything).
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  registerAll(tools: Tool[]): this {
    for (const t of tools) this.register(t);
    return this;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  /**
   * Returns the schema for each registered tool, in the OpenAI tool-call
   * format. The AgentExecutor appends this to the system prompt so the
   * LLM knows what it can call.
   */
  schemasForLLM(): Array<{
    name: string;
    description: string;
    input_schema: Tool['inputSchema'];
  }> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  /**
   * Runs a tool by name. Verifies permissions BEFORE invoking the tool
   * so a misbehaving agent cannot bypass them by calling the tool
   * directly.
   */
  async run(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolRunResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      const available = [...this.tools.keys()].join(', ');
      return fail(AppError.notFound(`Tool "${name}" does not exist. Available tools: ${available}`));
    }

    if (tool.requiresPermission) {
      const required = Array.isArray(tool.requiresPermission)
        ? tool.requiresPermission
        : [tool.requiresPermission];
      // Tools declare what path-prefix they need; the registry extracts
      // it from `input.path` (or `input.filePath`) and checks against the
      // agent's permissions.
      const target = String(input.path ?? input.filePath ?? '');
      if (target) {
        const okAccess = required.some((prefix) => target.startsWith(prefix)) && ctx.agent.canAccess(target);
        if (!okAccess) {
          return fail(
            AppError.forbidden(
              `Agent ${ctx.agent.name} (role=${ctx.agent.role}) cannot access ${target}. Required prefixes: ${required.join(', ')}`,
            ),
          );
        }
      }
    }

    return tool.run(input, ctx);
  }
}