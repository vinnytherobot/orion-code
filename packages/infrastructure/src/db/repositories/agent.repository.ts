import { eq } from 'drizzle-orm';
import { getDatabase } from '../database.js';
import { agents } from '../schemas/orchestration.js';
import type { IAgentRepository } from '@orion/domain';
import { Agent, AgentStatus } from '@orion/domain';
import type { AgentStatusValue } from '@orion/domain';

export class AgentRepository implements IAgentRepository {
  private db = getDatabase();

  async findById(id: string): Promise<Agent | null> {
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByName(name: string): Promise<Agent | null> {
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);

    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findAll(): Promise<Agent[]> {
    const results = await this.db.select().from(agents);
    return results.map(r => this.toDomain(r));
  }

  async findByProject(projectId: string): Promise<Agent[]> {
    const results = await this.db
      .select()
      .from(agents)
      .where(eq(agents.projectId, projectId));
    return results.map(r => this.toDomain(r));
  }

  async findByRole(role: string): Promise<Agent[]> {
    const results = await this.db
      .select()
      .from(agents)
      .where(eq(agents.role, role));
    return results.map(r => this.toDomain(r));
  }

  async save(agent: Agent): Promise<void> {
    const props = agent.toJSON();

    await this.db
      .insert(agents)
      .values({
        id: props.id,
        projectId: props.projectId,
        name: props.name,
        role: props.role,
        status: props.status.value,
        currentTaskId: props.currentTaskId,
        permissions: props.permissions,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: agents.id,
        set: {
          status: props.status.value,
          currentTaskId: props.currentTaskId,
          updatedAt: props.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(agents).where(eq(agents.id, id));
  }

  private toDomain(row: typeof agents.$inferSelect): Agent {
    return Agent.reconstitute({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      role: row.role,
      status: AgentStatus.from(row.status as AgentStatusValue),
      currentTaskId: row.currentTaskId,
      permissions: (row.permissions as string[]) || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
