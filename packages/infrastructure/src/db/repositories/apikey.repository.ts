import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database.js';
import type { ApiKey, NewApiKey } from '../schemas/schema.js';

export class ApiKeyRepository {
  private db = getDatabase();

  async findById(id: string): Promise<ApiKey | null> {
    const result = await this.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    const result = await this.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.key, key))
      .limit(1);
    return result[0] || null;
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    return await this.db.select().from(schema.apiKeys).where(eq(schema.apiKeys.userId, userId));
  }

  async findValidByKey(key: string): Promise<ApiKey | null> {
    const now = new Date();
    const result = await this.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.key, key))
      .limit(1);

    const apiKey = result[0];
    if (!apiKey) return null;

    // Check expiration in JS
    if (apiKey.expiresAt && apiKey.expiresAt < now) {
      return null;
    }

    return apiKey;
  }

  async create(data: NewApiKey): Promise<ApiKey> {
    await this.db.insert(schema.apiKeys).values(data).returning();
    return this.findById(data.id) as Promise<ApiKey>;
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.apiKeys)
      .where(eq(schema.apiKeys.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db
      .delete(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId))
      .returning();
    return result.length;
  }
}
