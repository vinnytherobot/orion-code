import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database.js';
import type { IUserRepository } from '@orion/domain';
import { User, UserId, Email, PasswordHash } from '@orion/domain';

export interface UserProviderConfig {
  name: string;
  apiKey?: string;
  model?: string;
}

export class UserDomainRepository implements IUserRepository {
  private db = getDatabase();

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (!result[0]) return null;
    return this.toDomain(result[0]);
  }

  async save(user: User): Promise<void> {
    const props = user.toJSON();
    await this.db
      .insert(schema.users)
      .values({
        id: props.id.toString(),
        name: props.name,
        email: props.email.toString(),
        passwordHash: props.passwordHash.toString(),
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          name: props.name,
          email: props.email.toString(),
          passwordHash: props.passwordHash.toString(),
          updatedAt: props.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async getProviderConfig(userId: string): Promise<UserProviderConfig | null> {
    const result = await this.db
      .select({ providerConfig: schema.users.providerConfig })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    const config = result[0]?.providerConfig;
    return config ?? null;
  }

  async setProviderConfig(userId: string, config: UserProviderConfig): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ providerConfig: config, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  private toDomain(row: typeof schema.users.$inferSelect): User {
    return User.reconstitute({
      id: UserId.from(row.id),
      name: row.name,
      email: Email.from(row.email),
      passwordHash: PasswordHash.fromHash(row.passwordHash),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
