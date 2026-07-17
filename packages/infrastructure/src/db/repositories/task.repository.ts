import { eq } from 'drizzle-orm';
import { getDatabase } from '../database.js';
import { tasks } from '../schemas/orchestration.js';
import type { ITaskRepository } from '@orion/domain';
import type { TaskStatusValue } from '@orion/domain';
import { Task, TaskId, TaskStatus } from '@orion/domain';

export class TaskRepository implements ITaskRepository {
  private db = getDatabase();

  async findById(id: string): Promise<Task | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByStatus(status: TaskStatusValue): Promise<Task[]> {
    const results = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, status));
    return results.map(r => this.toDomain(r));
  }

  async findByAssignedAgent(agentId: string): Promise<Task[]> {
    const results = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedAgentId, agentId));
    return results.map(r => this.toDomain(r));
  }

  async findByParent(parentTaskId: string): Promise<Task[]> {
    const results = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId));
    return results.map(r => this.toDomain(r));
  }

  async findAll(): Promise<Task[]> {
    const results = await this.db.select().from(tasks);
    return results.map(r => this.toDomain(r));
  }

  async save(task: Task): Promise<void> {
    const props = task.toJSON();

    await this.db
      .insert(tasks)
      .values({
        id: props.id.toString(),
        projectId: props.projectId,
        parentTaskId: props.parentTaskId,
        title: props.title,
        description: props.description,
        status: props.status.value,
        assignedAgentId: props.assignedAgentId,
        dependencies: props.dependencies,
        result: props.result,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          status: props.status.value,
          assignedAgentId: props.assignedAgentId,
          result: props.result,
          updatedAt: props.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }

  private toDomain(row: typeof tasks.$inferSelect): Task {
    return Task.reconstitute({
      id: TaskId.from(row.id),
      projectId: row.projectId,
      title: row.title,
      description: row.description,
      status: TaskStatus.from(row.status as TaskStatusValue),
      assignedAgentId: row.assignedAgentId,
      parentTaskId: row.parentTaskId,
      dependencies: (row.dependencies as string[]) || [],
      result: row.result,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
