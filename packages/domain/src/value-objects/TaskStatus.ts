export type TaskStatusValue =
  | "pending"
  | "planning"
  | "running"
  | "waiting"
  | "review"
  | "testing"
  | "completed"
  | "failed"
  | "cancelled";

export class TaskStatus {
  private constructor(public readonly value: TaskStatusValue) {}

  static pending(): TaskStatus {
    return new TaskStatus("pending");
  }

  static planning(): TaskStatus {
    return new TaskStatus("planning");
  }

  static running(): TaskStatus {
    return new TaskStatus("running");
  }

  static waiting(): TaskStatus {
    return new TaskStatus("waiting");
  }

  static review(): TaskStatus {
    return new TaskStatus("review");
  }

  static testing(): TaskStatus {
    return new TaskStatus("testing");
  }

  static completed(): TaskStatus {
    return new TaskStatus("completed");
  }

  static failed(): TaskStatus {
    return new TaskStatus("failed");
  }

  static cancelled(): TaskStatus {
    return new TaskStatus("cancelled");
  }

  static from(value: TaskStatusValue): TaskStatus {
    return new TaskStatus(value);
  }

  isPending(): boolean {
    return this.value === "pending";
  }

  isRunning(): boolean {
    return this.value === "running";
  }

  isTerminal(): boolean {
    return (
      this.value === "completed" ||
      this.value === "failed" ||
      this.value === "cancelled"
    );
  }

  canTransitionTo(next: TaskStatus): boolean {
    const transitions: Record<TaskStatusValue, TaskStatusValue[]> = {
      pending: ["planning", "cancelled"],
      planning: ["running", "cancelled"],
      running: ["waiting", "review", "testing", "completed", "failed", "cancelled"],
      waiting: ["running", "cancelled"],
      review: ["running", "completed", "failed"],
      testing: ["completed", "failed", "running"],
      completed: [],
      failed: ["pending", "cancelled"],
      cancelled: [],
    };
    return transitions[this.value]?.includes(next.value) ?? false;
  }

  equals(other: TaskStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
