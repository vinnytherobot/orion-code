import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { AppError } from '@orion/shared';
import type { ChatMessageRepository } from '@orion/infrastructure';

export interface ChatRouteDeps {
  chatMessageRepository: ChatMessageRepository;
}

/**
 * Endpoints for the TUI chat mode. Messages are persisted to the
 * `chat_messages` table and can be filtered by project.
 *
 * Routes:
 *   GET    /api/chat?projectId=...        — list history (newest first)
 *   POST   /api/chat                       — append a message
 *   DELETE /api/chat                       — clear history for the user
 */
export async function chatRoutes(fastify: FastifyInstance, deps: ChatRouteDeps) {
  const { chatMessageRepository } = deps;

  fastify.get('/api/chat', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const { projectId, limit } = request.query as { projectId?: string; limit?: string };

    const history = projectId
      ? await chatMessageRepository.listByUserAndProject(userId, projectId)
      : await chatMessageRepository.listByUser(userId);

    const cap = limit ? Number.parseInt(limit, 10) : 200;
    const messages = Number.isFinite(cap) ? history.slice(-cap) : history;

    return reply.send({ messages });
  });

  fastify.post('/api/chat', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const body = request.body as { role?: string; content?: string; projectId?: string };

    if (!body.role || !['user', 'assistant', 'system'].includes(body.role)) {
      return reply.status(400).send({ error: 'role must be one of: user, assistant, system' });
    }
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return reply.status(400).send({ error: 'content is required' });
    }

    try {
      const saved = await chatMessageRepository.save({
        id: randomUUID(),
        userId,
        projectId: body.projectId ?? null,
        role: body.role as 'user' | 'assistant' | 'system',
        content: body.content.trim(),
        createdAt: new Date(),
      });
      return reply.status(201).send({ message: saved });
    } catch (err) {
      return reply
        .status(500)
        .send({ error: AppError.internal(err instanceof Error ? err.message : String(err)).message });
    }
  });

  fastify.delete('/api/chat', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    await chatMessageRepository.deleteAllForUser(userId);
    return reply.send({ success: true });
  });
}

