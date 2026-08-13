import type { IOrchestratorPort } from '@orion/application';
import type { AgentResponseDTO, TaskResponseDTO } from '@orion/application';
import type { ExecutePlanInput } from '@orion/application';
import type { Result } from '@orion/shared';
import { AppError, ok, fail } from '@orion/shared';
import type { Agent, IAgentRepository, ITaskRepository, IDomainEventBus } from '@orion/domain';
import { Task, createTaskCompletedEvent } from '@orion/domain';
import type { AgentExecutor } from './AgentExecutor.js';
import type { ExecutionLogRepository } from '../db/repositories/execution-log.repository.js';
import type { WorktreeManager } from '../git/WorktreeManager.js';
import type { MergeResolver } from '../git/MergeResolver.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';
import type { LockManager } from './LockManager.js';
import type { MessageBus } from './MessageBus.js';
import { Scheduler } from './Scheduler.js';
import { PlannerService } from './PlannerService.js';
import { EventEmitter } from 'node:events';

interface OrchestratorConfig {
  maxConcurrentAgents: number;
  taskTimeoutMs: number;
  retryAttempts: number;
  /** Delay between retry attempts in ms. Defaults to 2000. */
  retryDelayMs?: number;
  /** Whether to try a different agent role on retry. Defaults to false. */
  escalateOnRetry?: boolean;
}

interface TaskExecutionMetrics {
  taskId: string;
  attempts: number;
  lastError?: string;
  totalDurationMs: number;
}

/**
 * The Orchestrator coordinates the lifecycle of a Task:
 *
 *   1. `executePlan()` accepts a flat plan from the API (titles +
 *      descriptions) and seeds them as pending Task rows.
 *   2. `runProject()` is the wave-based loop: it uses the `Scheduler`
 *      to compute waves (parallel groups), then runs every task in
 *      the current wave up to `maxConcurrentAgents` in parallel.
 *   3. For each task: claim it as `running`, pick an idle agent of the
 *      same role, run the tool-use loop inside an isolated git
 *      worktree, then commit and merge the result back.
 *   4. Permission gating is enforced by the `ToolRegistry`; path-level
 *      serialization is enforced by the `LockManager`.
 *
 * Events emitted (via EventEmitter):
 *   - `task:started`
 *   - `task:completed`
 *   - `task:failed`
 *   - `wave:completed`
 *   - `plan:completed`
 *
 * NOTE: The legacy `execute()` / `getNextTask()` API is preserved for
 * backwards compatibility with the existing HTTP routes.
 */
export class Orchestrator extends EventEmitter implements IOrchestratorPort {
  private runningExecutions = new Map<string, AbortController>();
  private readonly scheduler = new Scheduler();

  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly agentRepo: IAgentRepository,
    private readonly executor: AgentExecutor,
    private readonly config: OrchestratorConfig = {
      maxConcurrentAgents: 4,
      taskTimeoutMs: 300_000,
      retryAttempts: 2,
    },
    private readonly eventBus?: IDomainEventBus,
    private readonly executionLogRepo?: ExecutionLogRepository,
    private readonly worktreeManager?: WorktreeManager,
    private readonly mergeResolver?: MergeResolver,
    private readonly toolRegistry?: ToolRegistry,
    private readonly lockManager?: LockManager,
    private readonly messageBus?: MessageBus,
    private readonly projectResolver?: { rootPath: string },
    private readonly plannerService?: PlannerService,
  ) {
    super();
  }

  async executePlan(plan: ExecutePlanInput): Promise<Result<void, AppError>> {
    const createdTaskIds: string[] = [];
    for (const input of plan.tasks ?? []) {
      const task = Task.create({
        projectId: plan.projectId,
        title: input.title,
        description: input.description,
        role: input.role,
      });
      if (input.dependencies && input.dependencies.length > 0) {
        task.setDependencies(input.dependencies);
      }
      await this.taskRepo.save(task);
      createdTaskIds.push(task.id.toString());
    }
    // Kick off the async loop but don't await it — the HTTP response
    // returns immediately and the TUI follows via SSE.
    void this.runProject(plan.projectId).catch((err) => {
      this.emit('plan:failed', { projectId: plan.projectId, reason: String(err) });
    });
    return ok(undefined);
  }

  /**
   * Routes a user request through the Tech Lead Router and executes
   * the resulting plan. This is the new entry point for user requests.
   */
  async routeAndExecute(input: {
    projectId: string;
    rootPath: string;
    request: string;
  }): Promise<Result<void, AppError>> {
    if (!this.plannerService) {
      return fail(AppError.internal('PlannerService not configured'));
    }

    const routeResult = await this.plannerService.route({
      rootPath: input.rootPath,
      request: input.request,
    });

    if (routeResult.isFail()) {
      return fail(routeResult.error);
    }

    const { subtasks } = routeResult.value;

    // First pass: create all tasks and build localId → UUID mapping.
    // DagBuilder produces localId values like "0-architect", but
    // Task.setDependencies() expects actual task UUIDs.
    const localIdToTaskId = new Map<string, string>();
    for (const subtask of subtasks) {
      const task = Task.create({
        projectId: input.projectId,
        title: subtask.title,
        description: subtask.description,
        role: subtask.role,
      });
      await this.taskRepo.save(task);
      localIdToTaskId.set(subtask.localId, task.id.toString());
    }

    // Second pass: update dependencies with actual task IDs.
    for (const subtask of subtasks) {
      if (subtask.dependencies.length > 0) {
        const task = await this.taskRepo.findById(localIdToTaskId.get(subtask.localId) ?? '');
        if (task) {
          const actualDeps = subtask.dependencies
            .map(dep => localIdToTaskId.get(dep))
            .filter((id): id is string => id !== undefined);
          if (actualDeps.length > 0) {
            task.setDependencies(actualDeps);
            await this.taskRepo.save(task);
          }
        }
      }
    }

    // Start execution
    void this.runProject(input.projectId).catch((err) => {
      this.emit('plan:failed', { projectId: input.projectId, reason: String(err) });
    });

    return ok(undefined);
  }

  async assignTask(taskId: string, agentId: string): Promise<Result<void, AppError>> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return fail(AppError.notFound('Task'));

    const agent = await this.agentRepo.findById(agentId);
    if (!agent) return fail(AppError.notFound('Agent'));

    const assignResult = task.assignTo(agentId);
    if (assignResult.isFail()) return assignResult;

    const agentAssignResult = agent.assignTask(taskId);
    if (agentAssignResult.isFail()) return agentAssignResult;

    await this.taskRepo.save(task);
    await this.agentRepo.save(agent);

    return ok(undefined);
  }

  async getAvailableAgents(): Promise<AgentResponseDTO[]> {
    const agents = await this.agentRepo.findAll();
    return agents
      .filter((a) => a.status.isIdle())
      .map((a) => this.toAgentDTO(a));
  }

  async getNextTask(): Promise<TaskResponseDTO | null> {
    const pendingTasks = await this.taskRepo.findByStatus('pending');

    for (const task of pendingTasks) {
      if (await this.areDependenciesMet(task)) {
        return this.toTaskDTO(task);
      }
    }

    return null;
  }

  async reportTaskComplete(taskId: string, result: string): Promise<Result<void, AppError>> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return fail(AppError.notFound('Task'));

    const completeResult = task.complete(result);
    if (completeResult.isFail()) return fail(completeResult.error);

    if (task.assignedAgentId) {
      const agent = await this.agentRepo.findById(task.assignedAgentId);
      if (agent) {
        agent.completeTask();
        await this.agentRepo.save(agent);
      }
    }

    await this.taskRepo.save(task);
    this.emit('task:completed', { taskId, result });

    if (this.eventBus) {
      const event = createTaskCompletedEvent(taskId, task.assignedAgentId, result);
      await this.eventBus.publish(event);
    }

    return ok(undefined);
  }

  async reportTaskFailed(taskId: string, reason: string): Promise<Result<void, AppError>> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return fail(AppError.notFound('Task'));

    const failResult = task.fail(reason);
    if (failResult.isFail()) return fail(failResult.error);

    if (task.assignedAgentId) {
      const agent = await this.agentRepo.findById(task.assignedAgentId);
      if (agent) {
        agent.reset();
        await this.agentRepo.save(agent);
      }
    }

    await this.taskRepo.save(task);
    this.emit('task:failed', { taskId, reason });

    return ok(undefined);
  }

  /**
   * Wave-based run loop. Computes the wave schedule from the project's
   * pending tasks (filtered by `projectId` — this fixes the bug where
   * the previous version mixed tasks across projects) and processes
   * each wave in parallel.
   */
  async runProject(projectId: string): Promise<Result<void, AppError>> {
    // Reset all completed/stale agents to idle so they can be reused.
    const allAgents = await this.agentRepo.findByProject(projectId);
    for (const agent of allAgents) {
      if (!agent.status.isIdle()) {
        agent.reset();
        await this.agentRepo.save(agent);
      }
    }

    const projectTasks = await this.taskRepo.findByProjectId(projectId);

    if (projectTasks.length === 0) {
      return fail(AppError.notFound(`No tasks for project ${projectId}`));
    }

    const pendingTasks = projectTasks.filter((t) => t.status.isPending());
    if (pendingTasks.length === 0) {
      return fail(AppError.notFound(`No pending tasks for project ${projectId}`));
    }

    const schedule = this.scheduler.build(
      pendingTasks.map((t) => ({
        id: t.id.toString(),
        dependencies: [...t.dependencies],
      })),
    );
    if (schedule.isFail()) {
      return fail(schedule.error);
    }

    for (const wave of schedule.value) {
      this.emit('wave:started', { waveIndex: wave.index, taskIds: wave.taskIds });
      const waveResult = await this.runWave(pendingTasks, wave.taskIds);
      if (waveResult.isFail()) {
        return fail(waveResult.error);
      }
      this.emit('wave:completed', { waveIndex: wave.index, taskIds: wave.taskIds });
    }

    this.emit('plan:completed', { projectId });
    return ok(undefined);
  }

  /**
   * Runs a single wave. Each task in the wave starts as its own
   * promise, bounded by `maxConcurrentAgents`. If any task in the
   * wave fails the wave is reported as failed.
   */
  private async runWave(
    allTasks: readonly Task[],
    taskIds: readonly string[],
  ): Promise<Result<void, AppError>> {
    const byId = new Map(allTasks.map((t) => [t.id.toString(), t]));
    const queue = [...taskIds];

    // Launch up to maxConcurrentAgents tasks in parallel.
    // Stagger start by 2s each to avoid LLM rate-limit spikes.
    const workers: Promise<Result<void, AppError>>[] = [];
    while (queue.length > 0 && workers.length < this.config.maxConcurrentAgents) {
      const id = queue.shift();
      if (!id) break;
      const task = byId.get(id);
      if (!task) continue;
      const delay = workers.length * 2000;
      workers.push(
        new Promise((resolve) => setTimeout(resolve, delay)).then(() => this.runSingleTask(task)),
      );
    }

    // Wait for the first batch, then continue with remaining tasks
    // as slots free up.
    const firstBatch = await Promise.all(workers);
    for (const failResult of firstBatch) {
      if (failResult.isFail()) return fail(failResult.error);
    }

    // Process remaining tasks in parallel batches.
    while (queue.length > 0) {
      const batch: Promise<Result<void, AppError>>[] = [];
      while (queue.length > 0 && batch.length < this.config.maxConcurrentAgents) {
        const id = queue.shift();
        if (!id) break;
        const task = byId.get(id);
        if (!task) continue;
        batch.push(this.runSingleTask(task));
      }
      const results = await Promise.all(batch);
      for (const failResult of results) {
        if (failResult.isFail()) return fail(failResult.error);
      }
    }

    return ok(undefined);
  }

  /**
   * Runs a single task: claim → create worktree → execute →
   * commit → merge → report. If `executor.executeAgent` is available
   * we use the tool-use loop; otherwise we fall back to legacy
   * `executor.execute()`.
   *
   * Includes retry logic: if execution fails, the task is retried up
   * to `config.retryAttempts` times with configurable delay.
   */
  private async runSingleTask(task: Task): Promise<Result<void, AppError>> {
    const claim = task.start();
    if (claim.isFail()) {
      return fail(claim.error);
    }
    await this.taskRepo.save(task);

    const maxAttempts = this.config.retryAttempts + 1;
    const retryDelayMs = this.config.retryDelayMs ?? 2000;
    const metrics: TaskExecutionMetrics = {
      taskId: task.id.toString(),
      attempts: 0,
      totalDurationMs: 0,
    };
    const startedAt = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      metrics.attempts = attempt;

      if (attempt > 1) {
        this.emit('task:retrying', {
          taskId: task.id.toString(),
          attempt,
          maxAttempts,
          lastError: metrics.lastError,
        });
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }

      const agent = await this.claimAgentForRole(task.role, task.projectId);
      if (!agent) {
        const error = `No idle agent with role ${task.role}`;
        metrics.lastError = error;
        if (attempt === maxAttempts) {
          task.fail(error);
          await this.taskRepo.save(task);
          return fail(AppError.conflict(error));
        }
        continue;
      }

      const assignResult = agent.assignTask(task.id.toString());
      if (assignResult.isFail()) {
        metrics.lastError = assignResult.error.message;
        agent.reset();
        await this.agentRepo.save(agent);
        if (attempt === maxAttempts) {
          task.fail(assignResult.error.message);
          await this.taskRepo.save(task);
          return fail(assignResult.error);
        }
        continue;
      }
      await this.taskRepo.save(task);
      await this.agentRepo.save(agent);

      this.emit('task:started', { taskId: task.id.toString(), agentId: agent.id, attempt });

      const controller = new AbortController();
      this.runningExecutions.set(task.id.toString(), controller);

      const worktreePath = await this.maybeCreateWorktree(task);

      try {
        const execResult = await this.executeTask(task, agent, worktreePath, controller.signal);

        if (execResult.isFail()) {
          metrics.lastError = execResult.error.message;
          await this.maybeAbortWorktree(worktreePath);
          agent.reset();
          await this.agentRepo.save(agent);

          if (attempt === maxAttempts) {
            const durationMs = Date.now() - startedAt;
            metrics.totalDurationMs = durationMs;
            await this.executionLogRepo?.log({
              taskId: task.id.toString(),
              agentId: agent.id,
              input: task.description,
              durationMs,
              error: execResult.error.message,
            });
            task.fail(execResult.error.message);
            await this.taskRepo.save(task);
            this.emit('task:failed', { taskId: task.id.toString(), reason: execResult.error.message, attempts: attempt });
            return fail(execResult.error);
          }
          continue;
        }

        const exec = execResult.value;
        const mergedSha = await this.maybeCommitAndMerge(task, worktreePath, exec.output);
        const durationMs = Date.now() - startedAt;
        metrics.totalDurationMs = durationMs;

        await this.executionLogRepo?.log({
          taskId: task.id.toString(),
          agentId: agent.id,
          input: task.description,
          durationMs,
          output: mergedSha ? `${exec.output}\n[merge: ${mergedSha}]` : exec.output,
        });

        const success = task.complete(exec.output);
        if (success.isFail()) {
          return fail(success.error);
        }

        agent.completeTask();
        await this.taskRepo.save(task);
        await this.agentRepo.save(agent);

        this.emit('task:completed', {
          taskId: task.id.toString(),
          result: exec.output,
          attempts: attempt,
          durationMs,
        });

        if (this.eventBus) {
          await this.eventBus.publish(
            createTaskCompletedEvent(task.id.toString(), agent.id, exec.output),
          );
        }

        this.runningExecutions.delete(task.id.toString());
        return ok(undefined);
      } catch (error) {
        await this.maybeAbortWorktree(worktreePath);
        agent.reset();
        await this.agentRepo.save(agent);

        if (attempt === maxAttempts) {
          const durationMs = Date.now() - startedAt;
          metrics.totalDurationMs = durationMs;
          await this.executionLogRepo?.log({
            taskId: task.id.toString(),
            agentId: agent.id,
            input: task.description,
            error: String(error),
            durationMs,
          });
          task.fail(String(error));
          await this.taskRepo.save(task);
          this.emit('task:failed', { taskId: task.id.toString(), reason: String(error), attempts: attempt });
          return fail(AppError.internal(String(error)));
        }
      } finally {
        this.runningExecutions.delete(task.id.toString());
      }
    }

    // Should not reach here, but just in case
    return fail(AppError.internal('Task execution failed after all attempts'));
  }

  private async executeTask(
    task: Task,
    agent: Agent | null,
    worktreePath: string | null,
    signal: AbortSignal,
  ): Promise<Result<{ output: string }, AppError>> {
    if (!agent) {
      return fail(AppError.conflict('No agent'));
    }
    const taskDTO = this.toTaskDTO(task);
    if (
      this.toolRegistry &&
      this.lockManager &&
      worktreePath &&
      typeof (this.executor as { executeAgent?: unknown }).executeAgent === 'function'
    ) {
      const result = await this.executor.executeAgent({
        agent,
        task: taskDTO,
        worktreePath,
        toolRegistry: this.toolRegistry,
        lockManager: this.lockManager,
        signal,
        onOutput: (event) => {
          this.emit('agent:output', {
            taskId: task.id.toString(),
            ...event,
          });
        },
      });
      if (result.isFail()) return fail(result.error);
      return ok({ output: result.value.output });
    }
    // Legacy fallback.
    const result = await this.executor.execute(this.toAgentDTO(agent), taskDTO);
    if (result.isFail()) return fail(result.error);
    return ok({ output: result.value.output });
  }

  private async claimAgentForRole(role: string, projectId?: string) {
    const agents = projectId
      ? await this.agentRepo.findByProject(projectId)
      : await this.agentRepo.findAll();
    const idle = agents.filter((a) => a.status.isIdle());
    const sameRole = idle.find((a) => a.role === role);
    return sameRole ?? idle[0] ?? null;
  }

  private async maybeCreateWorktree(task: Task): Promise<string | null> {
    if (!this.worktreeManager || !this.projectResolver) return null;
    try {
      return await this.worktreeManager.createWorktree({
        projectPath: this.projectResolver.rootPath,
        taskId: task.id.toString(),
        branchName: `orion/${task.id.toString()}`,
      });
    } catch (err) {
      // Worktree creation failed (e.g. uncommitted changes, not a git
      // repo inside Docker). Fall back to writing directly in the
      // project root. The tool-use loop still runs — tools just write
      // to the project path instead of an isolated worktree.
      const reason = err instanceof Error ? err.message : String(err);
      await this.messageBus?.send({
        from: 'orchestrator',
        to: 'broadcast',
        type: 'notification',
        payload: { type: 'worktree:failed', taskId: task.id.toString(), reason },
      });
      return this.projectResolver.rootPath;
    }
  }

  private async maybeCommitAndMerge(
    task: Task,
    worktreePath: string | null,
    summary: string,
  ): Promise<string | null> {
    if (!worktreePath || !this.worktreeManager || !this.mergeResolver || !this.projectResolver) {
      return null;
    }
    const branchName = `orion/${task.id.toString()}`;
    try {
      const sha = await this.worktreeManager.commitAll({
        worktreePath,
        message: `Orion(${task.role}): ${task.title} — ${summary.slice(0, 100)}`,
      });
      if (!sha) return null;
      const result = await this.mergeResolver.merge({
        projectPath: this.projectResolver.rootPath,
        taskId: task.id.toString(),
        branchName,
        title: task.title,
      });
      if (result.isFail()) {
        await this.messageBus?.send({
          from: 'orchestrator',
          to: 'broadcast',
          type: 'notification',
          payload: {
            type: 'worktree:failed',
            taskId: task.id.toString(),
            reason: result.error.message,
          },
        });
        return null;
      }
      const outcome = result.value;
      if (outcome.status === 'merged') {
        await this.messageBus?.send({
          from: 'orchestrator',
          to: 'broadcast',
          type: 'notification',
          payload: {
            type: 'worktree:merged',
            taskId: task.id.toString(),
            sha: outcome.mergeCommitSha ?? sha,
          },
        });
        await this.worktreeManager.removeWorktree(this.projectResolver.rootPath, worktreePath);
        return outcome.mergeCommitSha ?? sha;
      }
      if (outcome.status === 'conflict') {
        await this.messageBus?.send({
          from: 'orchestrator',
          to: 'broadcast',
          type: 'notification',
          payload: {
            type: 'worktree:conflict',
            taskId: task.id.toString(),
            files: outcome.conflictFiles ?? [],
          },
        });
        return null;
      }
      return null;
    } catch (err) {
      await this.messageBus?.send({
        from: 'orchestrator',
        to: 'broadcast',
        type: 'notification',
        payload: {
          type: 'worktree:failed',
          taskId: task.id.toString(),
          reason: err instanceof Error ? err.message : String(err),
        },
      });
      return null;
    }
  }

  private async maybeAbortWorktree(worktreePath: string | null): Promise<void> {
    if (!worktreePath || !this.worktreeManager || !this.projectResolver) return;
    await this.worktreeManager
      .removeWorktree(this.projectResolver.rootPath, worktreePath)
      .catch(() => undefined);
  }

  private async areDependenciesMet(task: Task): Promise<boolean> {
    if (task.dependencies.length === 0) return true;
    const depTasks = await this.taskRepo.findByIds(task.dependencies);
    return depTasks.every((dep) => dep.status.isTerminal());
  }

  private toAgentDTO(agent: { toJSON(): any }): AgentResponseDTO {
    const props = agent.toJSON();
    return {
      id: props.id,
      name: props.name,
      role: props.role,
      status: props.status.value,
      currentTaskId: props.currentTaskId,
      permissions: [...props.permissions],
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }

  /**
   * Cancels a running task by aborting its execution.
   */
  async cancelTask(taskId: string): Promise<Result<void, AppError>> {
    const controller = this.runningExecutions.get(taskId);
    if (!controller) {
      return fail(AppError.notFound(`No running task with id ${taskId}`));
    }
    controller.abort();
    return ok(undefined);
  }

  private toTaskDTO(task: Task): TaskResponseDTO {
    const props = task.toJSON();
    return {
      id: props.id.toString(),
      title: props.title,
      description: props.description,
      status: props.status.value,
      assignedAgentId: props.assignedAgentId,
      parentTaskId: props.parentTaskId,
      dependencies: [...props.dependencies],
      result: props.result,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}
