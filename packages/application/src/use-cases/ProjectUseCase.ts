import crypto from 'node:crypto';
import type { IProjectRepository } from '@orion/domain';
import { Project } from '@orion/domain';
import { AppError, type Result, ok } from '@orion/shared';

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  path: string;
  ownerId: string;
  architecture: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async create(input: { userId: string; name: string; description?: string; path?: string }): Promise<Result<ProjectDTO, AppError>> {
    const project = Project.create({
      id: crypto.randomUUID(),
      name: input.name,
      rootPath: input.path || '/default',
      description: input.description,
    });
    await this.projectRepository.save(project, input.userId);
    return ok(this.toDTO(project, input.userId));
  }

  async findAll(userId: string): Promise<Result<ProjectDTO[], AppError>> {
    const projects = await this.projectRepository.findByUserId(userId);
    return ok(projects.map(p => this.toDTO(p, userId)));
  }

  async findById(id: string, userId: string): Promise<Result<ProjectDTO | null, AppError>> {
    const project = await this.projectRepository.findById(id);
    if (!project) return ok(null);
    return ok(this.toDTO(project, userId));
  }

  async update(id: string, userId: string, input: { name?: string; description?: string }): Promise<Result<ProjectDTO | null, AppError>> {
    const project = await this.projectRepository.findById(id);
    if (!project) return ok(null);
    const updated = Project.reconstitute({
      id: project.id,
      name: input.name ?? project.name,
      rootPath: project.rootPath,
      description: input.description ?? project.description,
      taskIds: [...project.taskIds],
      createdAt: project.createdAt,
      updatedAt: new Date(),
    });
    await this.projectRepository.save(updated, userId);
    return ok(this.toDTO(updated, userId));
  }

  async delete(id: string): Promise<Result<boolean, AppError>> {
    const project = await this.projectRepository.findById(id);
    if (!project) return ok(false);
    await this.projectRepository.delete(id);
    return ok(true);
  }

  private toDTO(project: Project, userId: string): ProjectDTO {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      path: project.rootPath,
      ownerId: userId,
      architecture: 'ddd',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
