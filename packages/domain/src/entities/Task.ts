import { type Result, ok, fail, AppError } from "@orion/shared";
import { TaskId } from "../value-objects/TaskId.js";
import { TaskStatus } from "../value-objects/TaskStatus.js";

export interface TaskProps {
  id: TaskId;
  title: string;
  description: string;
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

  static create(input: { title: string; description: string; parentTaskId?: string }): Task {
    return new Task({
      id: TaskId.generate(),
      title: input.title,
      description: input.description,
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

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
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
      return fail(AppError.conflict("Cannot assign a terminal task"));
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

  toJSON(): TaskProps {
    return { ...this.props };
  }
}
