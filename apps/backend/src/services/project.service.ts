import crypto from 'crypto';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.js';

interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  architecture: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store
const projects = new Map<string, Project>();

export class ProjectService {
  async create(userId: string, input: CreateProjectInput): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      path: input.path,
      description: input.description,
      architecture: input.architecture,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    projects.set(project.id, project);
    return project;
  }

  async findAll(userId: string): Promise<Project[]> {
    return Array.from(projects.values()).filter(p => p.ownerId === userId);
  }

  async findById(id: string, userId: string): Promise<Project | null> {
    const project = projects.get(id);
    if (!project || project.ownerId !== userId) return null;
    return project;
  }

  async update(id: string, userId: string, input: UpdateProjectInput): Promise<Project | null> {
    const project = projects.get(id);
    if (!project || project.ownerId !== userId) return null;

    const updated: Project = {
      ...project,
      ...input,
      updatedAt: new Date(),
    };

    projects.set(id, updated);
    return updated;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const project = projects.get(id);
    if (!project || project.ownerId !== userId) return false;

    projects.delete(id);
    return true;
  }
}
