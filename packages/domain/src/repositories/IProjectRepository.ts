import type { Project } from '../entities/Project.js';

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  save(project: Project, userId?: string): Promise<void>;
  delete(id: string): Promise<void>;
}
