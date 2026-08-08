import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDatabase } from '../database.js';
import { chatMessages } from '../schemas/orchestration.js';
import type { ChatMessage, NewChatMessage } from '../schemas/orchestration.js';

/**
 * Repository for chat_messages. Persists the conversation with the "tech
 * lead" agent (TODO.md: "Create Chat mode"). Each user/project pair has a
 * single, append-only history; the orchestrator reads the last N messages
 * to ground the LLM's responses in the latest context.
 */
export class ChatMessageRepository {
  private db = getDatabase();

  async save(message: NewChatMessage): Promise<ChatMessage> {
    const [row] = await this.db
      .insert(chatMessages)
      .values(message)
      .onConflictDoNothing({ target: chatMessages.id })
      .returning();
    if (!row) {
      const existing = await this.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, message.id))
        .limit(1);
      return existing[0]!;
    }
    return row;
  }

  async listByUser(userId: string, limit = 50): Promise<ChatMessage[]> {
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async listBySession(sessionId: string): Promise<ChatMessage[]> {
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt));
    return rows.reverse();
  }

  async listByUserAndProject(
    userId: string,
    projectId: string | null,
    limit = 50,
  ): Promise<ChatMessage[]> {
    const where = projectId
      ? and(eq(chatMessages.userId, userId), eq(chatMessages.projectId, projectId))!
      : and(eq(chatMessages.userId, userId), isNull(chatMessages.projectId))!;
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(where)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }
}