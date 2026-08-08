import { desc, eq, sql } from 'drizzle-orm';
import { getDatabase } from '../database.js';
import { chatSessions, chatMessages } from '../schemas/orchestration.js';
import type { ChatSession, NewChatSession } from '../schemas/orchestration.js';

export interface ChatSessionWithCount extends ChatSession {
  messageCount: number;
}

export class ChatSessionRepository {
  private db = getDatabase();

  async create(session: NewChatSession): Promise<ChatSession> {
    const [row] = await this.db
      .insert(chatSessions)
      .values(session)
      .returning();
    return row!;
  }

  async listByUser(userId: string, limit = 20): Promise<ChatSessionWithCount[]> {
    const rows = await this.db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        title: chatSessions.title,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
        messageCount: sql<number>`cast(count(${chatMessages.id}) as int)`,
      })
      .from(chatSessions)
      .leftJoin(chatMessages, eq(chatSessions.id, chatMessages.sessionId))
      .where(eq(chatSessions.userId, userId))
      .groupBy(chatSessions.id)
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit);
    return rows;
  }

  async findById(id: string): Promise<ChatSession | null> {
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await this.db
      .update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatSessions.id, id));
  }

  async touch(id: string): Promise<void> {
    await this.db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(chatSessions).where(eq(chatSessions.id, id));
  }
}
