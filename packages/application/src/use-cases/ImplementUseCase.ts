import type { Agent, IAgentRepository, ITaskRepository, Task } from '@orion/domain';
import { AppError, type Result, fail, ok } from '@orion/shared';
import { TaskAssignmentService, createTaskCompletedEvent } from '@orion/domain';
import type { TaskResponseDTO } from '../dtos/TaskDTO.js';
import type { IAgentExecutorPort } from '../ports/IAgentExecutorPort.js';
import type { IEventBusPort } from '../ports/IEventBusPort.js';
import type { IUnitOfWorkPort } from '../ports/IUnitOfWorkPort.js';

function toTaskResponse(task: Task): TaskResponseDTO {
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

function toAgentResponse(agent: Agent) {
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

export class ImplementUseCase {
  private assignmentService = new TaskAssignmentService();

  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly agentExecutor: IAgentExecutorPort,
    private readonly eventBus?: IEventBusPort,
    private readonly uow?: IUnitOfWorkPort,
  ) {}

  async execute(input: { taskId: string }): Promise<Result<TaskResponseDTO, AppError>> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      return fail(AppError.notFound('Task'));
    }

    const startResult = task.start();
    if (startResult.isFail()) {
      return fail(startResult.error);
    }

    const agents = await this.agentRepository.findAll();
    const idleAgent = agents.find((a) => a.status.isIdle());
    if (!idleAgent) {
      return fail(AppError.conflict('No idle agents available'));
    }

    const assignResult = this.assignmentService.assignTaskToAgent(task, idleAgent);
    if (assignResult.isFail()) {
      return fail(assignResult.error);
    }

    if (this.uow) await this.uow.begin();

    try {
      await this.taskRepository.save(task);
      await this.agentRepository.save(idleAgent);

      if (this.uow) await this.uow.commit();
    } catch (error) {
      if (this.uow) await this.uow.rollback();
      return fail(AppError.internal(error instanceof Error ? error.message : 'Failed to persist task assignment'));
    }

    const execResult = await this.agentExecutor.execute(
      toAgentResponse(idleAgent),
      toTaskResponse(task),
    );

    if (this.uow) await this.uow.begin();

    try {
      if (execResult.isFail()) {
        this.assignmentService.failTaskAssignment(task, idleAgent, execResult.error.message);
        await this.taskRepository.save(task);
        await this.agentRepository.save(idleAgent);
        if (this.uow) await this.uow.commit();
        return fail(execResult.error);
      }

      const execution = execResult.value;
      if (execution.success) {
        this.assignmentService.completeTaskAssignment(task, idleAgent, execution.output);
      } else {
        this.assignmentService.failTaskAssignment(task, idleAgent, execution.output);
      }

      await this.taskRepository.save(task);
      await this.agentRepository.save(idleAgent);

      if (this.uow) await this.uow.commit();

      // Publish domain event
      if (this.eventBus && execution.success) {
        const event = createTaskCompletedEvent(
          task.id.toString(),
          idleAgent.id,
          execution.output,
        );
        await this.eventBus.publish(event);
      }

      return ok(toTaskResponse(task));
    } catch (error) {
      if (this.uow) await this.uow.rollback();
      return fail(AppError.internal(error instanceof Error ? error.message : 'Execution failed'));
    }
  }
}