import type { Task } from "../entities/Task.js";
import type { TaskStatusValue } from "../value-objects/TaskStatus.js";

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByStatus(status: TaskStatusValue): Promise<Task[]>;
  findByAssignedAgent(agentId: string): Promise<Task[]>;
  findByParent(parentTaskId: string): Promise<Task[]>;
  findAll(): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
}
