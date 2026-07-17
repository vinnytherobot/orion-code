import { type ITaskRepository, Task } from '@orion/domain';
import { AppError, type Result, ValidationError, fail, ok } from '@orion/shared';
import type { CreateTaskDTO, TaskResponseDTO } from '../dtos/TaskDTO.js';
import type { IUnitOfWorkPort } from '../ports/IUnitOfWorkPort.js';

export interface PlanResult {
  tasks: TaskResponseDTO[];
}

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

export class PlanUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly uow?: IUnitOfWorkPort,
  ) {}

  async execute(input: { projectId: string; tasks: CreateTaskDTO[] }): Promise<Result<PlanResult, AppError>> {
    if (!input.tasks || input.tasks.length === 0) {
      return fail(ValidationError.fromField('tasks', 'At least one task is required'));
    }

    if (!input.projectId?.trim()) {
      return fail(ValidationError.fromField('projectId', 'Project ID is required'));
    }

    const validationErrors = input.tasks.flatMap((t, i) => {
      const errors: { field: string; message: string }[] = [];
      if (!t.title?.trim())
        errors.push({ field: `tasks[${i}].title`, message: 'Title is required' });
      if (!t.description?.trim())
        errors.push({ field: `tasks[${i}].description`, message: 'Description is required' });
      return errors;
    });

    if (validationErrors.length > 0) {
      return fail(ValidationError.fromFields(validationErrors));
    }

    if (this.uow) await this.uow.begin();

    try {
      const createdTasks: Task[] = [];
      for (const dto of input.tasks) {
        const task = Task.create({
          projectId: input.projectId,
          title: dto.title,
          description: dto.description,
          parentTaskId: dto.parentTaskId,
        });
        await this.taskRepository.save(task);
        createdTasks.push(task);
      }

      if (this.uow) await this.uow.commit();

      return ok({ tasks: createdTasks.map(toTaskResponse) });
    } catch (error) {
      if (this.uow) await this.uow.rollback();
      return fail(AppError.internal(error instanceof Error ? error.message : 'Plan execution failed'));
    }
  }
}
