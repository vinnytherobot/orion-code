import { eq } from 'drizzle-orm';
import { getDatabase } from '../database.js';
import { projects } from '../schemas/orchestration.js';
import type { IProjectRepository } from '@orion/domain';
import { Project } from '@orion/domain';

export class ProjectDomainRepository implements IProjectRepository {
  private db = getDatabase();

  async findById(id: string): Promise<Project | null> {
    const result = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const results = await this.db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
    return results.map(r => this.toDomain(r));
  }

  async save(project: Project, userId?: string): Promise<void> {
    const props = project.toJSON();
    await this.db
      .insert(projects)
      .values({
        id: props.id,
        name: props.name,
        description: props.description,
        path: props.rootPath,
        userId: userId || '',
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: props.name,
          description: props.description,
          updatedAt: props.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  private toDomain(row: typeof projects.$inferSelect): Project {
    return Project.reconstitute({
      id: row.id,
      name: row.name,
      rootPath: row.path,
      description: row.description ?? '',
      taskIds: [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
