import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database.js';
import type { NewUser, User } from '../schemas/schema.js';

export class UserRepository {
  private db = getDatabase();

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async create(data: NewUser): Promise<User> {
    await this.db.insert(schema.users).values(data).returning();
    return this.findById(data.id) as Promise<User>;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    await this.db.update(schema.users).set(data).where(eq(schema.users.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.users).where(eq(schema.users.id, id)).returning();
    return result.length > 0;
  }
}
