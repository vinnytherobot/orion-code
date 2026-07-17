import { AppError, type Result, fail, ok } from '@orion/shared';
import { AgentStatus } from '../value-objects/AgentStatus.js';

export interface AgentProps {
  id: string;
  projectId: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTaskId: string | null;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Agent {
  private constructor(private props: AgentProps) {}

  static create(input: { id: string; projectId: string; name: string; role: string; permissions?: string[] }): Agent {
    return new Agent({
      id: input.id,
      projectId: input.projectId,
      name: input.name,
      role: input.role,
      status: AgentStatus.idle(),
      currentTaskId: null,
      permissions: input.permissions ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: AgentProps): Agent {
    return new Agent(props);
  }

  get id(): string {
    return this.props.id;
  }

  get projectId(): string {
    return this.props.projectId;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): string {
    return this.props.role;
  }

  get status(): AgentStatus {
    return this.props.status;
  }

  get currentTaskId(): string | null {
    return this.props.currentTaskId;
  }

  get permissions(): readonly string[] {
    return this.props.permissions;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  assignTask(taskId: string): Result<void, AppError> {
    if (!this.props.status.isIdle()) {
      return fail(AppError.conflict('Agent is not idle'));
    }
    this.props.currentTaskId = taskId;
    this.props.status = AgentStatus.running();
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  completeTask(): Result<void, AppError> {
    if (!this.props.status.isRunning()) {
      return fail(AppError.conflict('Agent is not running a task'));
    }
    this.props.currentTaskId = null;
    this.props.status = AgentStatus.completed();
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  reset(): void {
    this.props.currentTaskId = null;
    this.props.status = AgentStatus.idle();
    this.props.updatedAt = new Date();
  }

  canAccess(resourcePath: string): boolean {
    return this.props.permissions.some((p) => resourcePath.startsWith(p));
  }

  toJSON(): AgentProps {
    return { ...this.props };
  }
}
