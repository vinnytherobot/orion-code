import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database.js';
import type { IRefreshTokenRepository } from '@orion/domain';
import { RefreshToken } from '@orion/domain';

export class RefreshTokenDomainRepository implements IRefreshTokenRepository {
  private db = getDatabase();

  async findByToken(token: string): Promise<RefreshToken | null> {
    const result = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, token))
      .limit(1);
    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    const results = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId));
    return results.map(r => this.toDomain(r));
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    const props = refreshToken.toJSON();
    await this.db
      .insert(schema.refreshTokens)
      .values({
        id: props.id,
        userId: props.userId,
        token: props.token,
        expiresAt: props.expiresAt,
        createdAt: props.createdAt,
      })
      .onConflictDoUpdate({
        target: schema.refreshTokens.id,
        set: {
          expiresAt: props.expiresAt,
        },
      });
  }

  async delete(token: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, token))
      .returning();
    return result.length > 0;
  }

  private toDomain(row: typeof schema.refreshTokens.$inferSelect): RefreshToken {
    return RefreshToken.reconstitute({
      id: row.id,
      userId: row.userId,
      token: row.token,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }
}
