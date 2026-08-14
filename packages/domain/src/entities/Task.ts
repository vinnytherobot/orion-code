import { AppError, type Result, fail, ok } from '@orion/shared';
import { TaskId } from '../value-objects/TaskId.js';
import { TaskStatus } from '../value-objects/TaskStatus.js';

export interface TaskProps {
  id: TaskId;
  projectId: string;
  title: string;
  description: string;
  /** Which specialist agent role should execute this task (planner, backend, qa, ...). */
  role: string;
  status: TaskStatus;
  assignedAgentId: string | null;
  parentTaskId: string | null;
  dependencies: string[];
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Task {
  private constructor(private props: TaskProps) {}

  static create(input: { projectId: string; title: string; description: string; parentTaskId?: string; role?: string }): Task {
    return new Task({
      id: TaskId.generate(),
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      role: input.role ?? 'backend',
      status: TaskStatus.pending(),
      assignedAgentId: null,
      parentTaskId: input.parentTaskId ?? null,
      dependencies: [],
      result: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: TaskProps): Task {
    return new Task(props);
  }

  get id(): TaskId {
    return this.props.id;
  }

  get projectId(): string {
    return this.props.projectId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get role(): string {
    return this.props.role;
  }

  setRole(role: string): void {
    this.props.role = role;
    this.props.updatedAt = new Date();
  }

  setDependencies(deps: string[]): void {
    this.props.dependencies = [...deps];
    this.props.updatedAt = new Date();
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get assignedAgentId(): string | null {
    return this.props.assignedAgentId;
  }

  get parentTaskId(): string | null {
    return this.props.parentTaskId;
  }

  get dependencies(): readonly string[] {
    return this.props.dependencies;
  }

  get result(): string | null {
    return this.props.result;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  assignTo(agentId: string): Result<void, AppError> {
    if (this.props.status.isTerminal()) {
      return fail(AppError.conflict('Cannot assign a terminal task'));
    }
    this.props.assignedAgentId = agentId;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  start(): Result<void, AppError> {
    const next = TaskStatus.running();
    if (!this.props.status.canTransitionTo(next)) {
      return fail(AppError.conflict(`Cannot start task from status ${this.props.status}`));
    }
    this.props.status = next;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  complete(result: string): Result<void, AppError> {
    const next = TaskStatus.completed();
    if (!this.props.status.canTransitionTo(next)) {
      return fail(AppError.conflict(`Cannot complete task from status ${this.props.status}`));
    }
    this.props.status = next;
    this.props.result = result;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  fail(reason: string): Result<void, AppError> {
    const next = TaskStatus.failed();
    if (!this.props.status.canTransitionTo(next)) {
      return fail(AppError.conflict(`Cannot fail task from status ${this.props.status}`));
    }
    this.props.status = next;
    this.props.result = reason;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  cancel(): Result<void, AppError> {
    const next = TaskStatus.cancelled();
    if (!this.props.status.canTransitionTo(next)) {
      return fail(AppError.conflict(`Cannot cancel task from status ${this.props.status}`));
    }
    this.props.status = next;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  reset(): Result<void, AppError> {
    const next = TaskStatus.pending();
    if (!this.props.status.canTransitionTo(next)) {
      return fail(AppError.conflict(`Cannot reset task from status ${this.props.status}`));
    }
    this.props.status = next;
    this.props.result = null;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  toJSON(): TaskProps {
    return { ...this.props };
  }
}
