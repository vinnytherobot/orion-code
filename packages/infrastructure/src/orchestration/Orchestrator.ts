import type { IOrchestratorPort } from '@orion/application';
import type { AgentResponseDTO, TaskResponseDTO } from '@orion/application';
import type { Result } from '@orion/shared';
import { AppError, ok, fail } from '@orion/shared';
import type { IAgentRepository, ITaskRepository, IDomainEventBus } from '@orion/domain';
import { createTaskCompletedEvent } from '@orion/domain';
import type { AgentExecutor } from './AgentExecutor.js';
import { EventEmitter } from 'node:events';

interface OrchestratorConfig {
  maxConcurrentAgents: number;
  taskTimeoutMs: number;
  retryAttempts: number;
}

export class Orchestrator extends EventEmitter implements IOrchestratorPort {
  private runningExecutions = new Map<string, AbortController>();
  
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
  ) {
    super();
  }

  async executePlan(_tasks: TaskResponseDTO[]): Promise<Result<void, AppError>> {
    // Start execution loop
    this.processQueue();
    
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
      .filter(a => a.status.isIdle())
      .map(a => this.toAgentDTO(a));
  }

  async getNextTask(): Promise<TaskResponseDTO | null> {
    // Get tasks that are ready (pending, all dependencies met)
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
    if (completeResult.isFail()) return completeResult;
    
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
    
    this.processQueue();
    
    return ok(undefined);
  }

  async reportTaskFailed(taskId: string, reason: string): Promise<Result<void, AppError>> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return fail(AppError.notFound('Task'));
    
    const failResult = task.fail(reason);
    if (failResult.isFail()) return failResult;
    
    // Reset agent
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

  // Private methods

  private async processQueue(): Promise<void> {
    while (this.runningExecutions.size < this.config.maxConcurrentAgents) {
      const nextTask = await this.getNextTask();
      if (!nextTask) break;
      
      const availableAgent = await this.findAgentForTask(nextTask);
      if (!availableAgent) break;
      
      this.startExecution(nextTask, availableAgent);
    }
  }

  private async startExecution(task: TaskResponseDTO, agent: AgentResponseDTO): Promise<void> {
    const controller = new AbortController();
    this.runningExecutions.set(task.id, controller);
    
    this.emit('task:started', { taskId: task.id, agentId: agent.id });
    
    try {
      const result = await this.executor.execute(agent, task);
      
      if (result.isFail()) {
        await this.reportTaskFailed(task.id, result.error.message);
      } else if (result.value.success) {
        await this.reportTaskComplete(task.id, result.value.output);
      } else {
        await this.reportTaskFailed(task.id, result.value.output);
      }
    } catch (error) {
      await this.reportTaskFailed(task.id, String(error));
    } finally {
      this.runningExecutions.delete(task.id);
    }
  }

  private async areDependenciesMet(task: any): Promise<boolean> {
    for (const depId of task.dependencies) {
      const depTask = await this.taskRepo.findById(depId);
      if (!depTask || !depTask.status.isTerminal()) {
        return false;
      }
    }
    return true;
  }

  private async findAgentForTask(task: TaskResponseDTO): Promise<AgentResponseDTO | null> {
    const agents = await this.getAvailableAgents();
    
    // Find agent with matching role
    const roleMap: Record<string, string[]> = {
      'planning': ['planner'],
      'implementation': ['backend', 'frontend'],
      'testing': ['qa'],
    };
    
    const requiredRoles = roleMap[task.status] || [];
    
    return agents.find(a => requiredRoles.includes(a.role)) || agents[0] || null;
  }

  private toAgentDTO(agent: any): AgentResponseDTO {
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

  private toTaskDTO(task: any): TaskResponseDTO {
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
