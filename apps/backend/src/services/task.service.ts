import crypto from 'crypto';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.js';

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'planning' | 'running' | 'waiting' | 'review' | 'testing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  assignedAgent?: string;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// In-memory store
const tasks = new Map<string, Task>();

export class TaskService {
  async create(_userId: string, projectId: string, input: CreateTaskInput): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      projectId,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority,
      dependencies: input.dependencies,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.set(task.id, task);
    return task;
  }

  async findAll(_userId: string, projectId?: string): Promise<Task[]> {
    return Array.from(tasks.values()).filter(t => {
      if (projectId) return t.projectId === projectId;
      return true;
    });
  }

  async findById(id: string): Promise<Task | null> {
    return tasks.get(id) || null;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const task = tasks.get(id);
    if (!task) return null;

    const updated: Task = {
      ...task,
      ...input,
      updatedAt: new Date(),
    };

    if (input.status === 'completed') {
      updated.completedAt = new Date();
    }

    tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return tasks.delete(id);
  }

  async getProjectStats(projectId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const projectTasks = Array.from(tasks.values()).filter(t => t.projectId === projectId);

    return {
      total: projectTasks.length,
      pending: projectTasks.filter(t => t.status === 'pending').length,
      running: projectTasks.filter(t => t.status === 'running').length,
      completed: projectTasks.filter(t => t.status === 'completed').length,
      failed: projectTasks.filter(t => t.status === 'failed').length,
    };
  }
}
