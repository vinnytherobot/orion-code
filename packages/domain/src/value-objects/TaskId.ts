import { randomUUID } from "node:crypto";

export class TaskId {
  private constructor(public readonly value: string) {}

  static generate(): TaskId {
    return new TaskId(randomUUID());
  }

  static from(value: string): TaskId {
    return new TaskId(value);
  }

  equals(other: TaskId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
