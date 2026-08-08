import type { AppError, Result } from '@orion/shared';
import type { Agent } from '@orion/domain';
import type { AgentResponseDTO } from '../dtos/AgentDTO.js';
import type { TaskResponseDTO } from '../dtos/TaskDTO.js';

export interface AgentExecutionResult {
  success: boolean;
  output: string;
  artifacts?: string[];
  /**
   * Recorded tool calls when the agent used the tool-use loop. Useful
   * for the execution log and to render progress in the TUI.
   */
  toolCalls?: Array<{ name: string; input: Record<string, unknown>; output: string }>;
}

/**
 * Inputs for the `executeAgent` method that runs the iterative tool-use
 * loop. The concrete `toolRegistry` and `lockManager` are typed as
 * `unknown` here to avoid a circular dependency between `@orion/application`
 * and `@orion/infrastructure`; the orchestrator (which knows both) is
 * the only place this interface is fully realized.
 */
export interface ExecuteAgentInput {
  agent: Agent;
  task: TaskResponseDTO;
  worktreePath: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolRegistry: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lockManager: any;
  maxTurns?: number;
  signal?: AbortSignal;
}

export interface IAgentExecutorPort {
  /** Legacy single-shot path, used by the non-tool Orchestrator. */
  execute(
    agent: AgentResponseDTO,
    task: TaskResponseDTO,
  ): Promise<Result<AgentExecutionResult, AppError>>;

  /**
   * Runs the agent loop with tool use. The LLM is told which tools are
   * available (filtered by the agent's permissions) and may call them
   * until it responds with `done` or exceeds `maxTurns`.
   */
  executeAgent(
    input: ExecuteAgentInput,
  ): Promise<Result<AgentExecutionResult, AppError>>;

  /**
   * Helper for use cases that need a structured (JSON) output from the
   * LLM — used by the Planner to decompose a request into subtasks.
   */
  chatStructured?<T>(request: {
    systemPrompt: string;
    userPrompt: string;
    validate?: (raw: unknown) => T;
    retries?: number;
  }): Promise<Result<T, AppError>>;

  cancel(taskId: string): Promise<Result<void, AppError>>;
}