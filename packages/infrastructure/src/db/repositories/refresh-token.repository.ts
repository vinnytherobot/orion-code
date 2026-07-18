import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database.js';
import type { NewRefreshToken, RefreshToken } from '../schemas/schema.js';

export class RefreshTokenRepository {
  private db = getDatabase();

  async findByToken(token: string): Promise<RefreshToken | null> {
    const result = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, token))
      .limit(1);
    return result[0] || null;
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId));
  }

  async create(data: NewRefreshToken): Promise<RefreshToken> {
    await this.db.insert(schema.refreshTokens).values(data).returning();
    return this.findByToken(data.token) as Promise<RefreshToken>;
  }

  async delete(token: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, token))
      .returning();
    return result.length > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId))
      .returning();
    return result.length;
  }
}
