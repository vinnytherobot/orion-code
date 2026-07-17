import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database.js';
import type { IApiKeyRepository } from '@orion/domain';
import { ApiKey } from '@orion/domain';

export class ApiKeyDomainRepository implements IApiKeyRepository {
  private db = getDatabase();

  async findById(id: string): Promise<ApiKey | null> {
    const result = await this.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, id))
      .limit(1);
    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    const result = await this.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.key, key))
      .limit(1);
    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId));
    return results.map(r => this.toDomain(r));
  }

  async save(apiKey: ApiKey): Promise<void> {
    const props = apiKey.toJSON();
    await this.db
      .insert(schema.apiKeys)
      .values({
        id: props.id,
        userId: props.userId,
        name: props.name,
        key: props.key,
        lastUsedAt: props.lastUsedAt,
        expiresAt: props.expiresAt,
        createdAt: props.createdAt,
      })
      .onConflictDoUpdate({
        target: schema.apiKeys.id,
        set: {
          lastUsedAt: props.lastUsedAt,
        },
      });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.apiKeys)
      .where(eq(schema.apiKeys.id, id))
      .returning();
    return result.length > 0;
  }

  private toDomain(row: typeof schema.apiKeys.$inferSelect): ApiKey {
    return ApiKey.reconstitute({
      id: row.id,
      userId: row.userId,
      name: row.name,
      key: row.key,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }
}
