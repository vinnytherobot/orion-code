import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { AppError } from '@orion/shared';
import type { ChatMessageRepository, ChatSessionRepository, LLMMessage } from '@orion/infrastructure';
import type { AgentExecutor } from '@orion/infrastructure';

export interface ChatRouteDeps {
  chatMessageRepository: ChatMessageRepository;
  chatSessionRepository: ChatSessionRepository;
  agentExecutor: AgentExecutor;
}

const TECH_LEAD_SYSTEM_PROMPT = `You are the Orion Code Tech Lead — an AI engineering leader who coordinates a team of specialized agents.

## Your Team
- Planner — Breaks down requests into actionable tasks with dependencies
- Architect — Defines project structure, technical decisions, and standards
- Backend — Implements business logic, controllers, services (DDD/Clean Architecture)
- Database — Designs schemas, migrations, indexes (Prisma/TypeORM/Drizzle)
- Frontend — Builds UI components, layouts, API integration
- QA — Writes unit/integration/e2e tests, validates coverage
- Reviewer — Reviews code for SOLID, Clean Architecture, DDD, bugs
- DevOps — Docker, CI/CD, GitHub Actions, container management
- Security — Vulnerability analysis, auth verification, secret detection
- Performance — Query optimization, caching, bottleneck identification
- Git — Commits, changelog, PRs, release notes
- Documentation — README, OpenAPI/Swagger, usage examples

## Your Role
1. Understand requirements — Ask clarifying questions when scope is unclear
2. Plan decomposition — Break work into tasks and recommend which agents handle each
3. Advise on architecture — Guide technical decisions, trade-offs, and patterns
4. Coordinate agents — Explain which agents to use and in what order
5. Review strategy — Suggest review/test approaches before implementation

## Project Context
Monorepo: apps/tui (Ink/React), apps/backend (Fastify), packages/application, packages/domain, packages/infrastructure, packages/shared.
Tech stack: TypeScript, Ink, Fastify, Drizzle ORM, PostgreSQL, Docker.

## Guidelines
- Be concise and actionable. The user is an engineer.
- When suggesting agent work, specify the agent and the exact task.
- For multi-step work, provide a numbered execution plan.
- Reference specific files/paths when relevant.
- If the request is ambiguous, ask ONE focused clarifying question.
- Do not hallucinate file paths or function names.`;

/**
 * Endpoints for the TUI chat mode.
 *
 * Routes:
 *   GET    /api/chat?projectId=...        — list history (newest first)
 *   POST   /api/chat                       — append a message
 *   DELETE /api/chat                       — clear history for the user
 *   GET    /api/chat/sessions              — list user's chat sessions
 *   POST   /api/chat/sessions              — create a new chat session
 *   GET    /api/chat/sessions/:id          — get session with messages
 *   POST   /api/chat/techlead              — send message and get LLM reply
 */
export async function chatRoutes(fastify: FastifyInstance, deps: ChatRouteDeps) {
  const { chatMessageRepository, chatSessionRepository, agentExecutor } = deps;

  // ── Legacy chat endpoints (kept for backwards compatibility) ──

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

  // ── Streaming main chat endpoint (SSE) ──

  fastify.get('/api/chat/stream', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { content } = request.query as { content?: string };
    if (!content || typeof content !== 'string' || !content.trim()) {
      return reply.status(400).send({ error: 'content is required' });
    }

    const provider = agentExecutor.getProvider();
    if (!provider.chatStream) {
      return reply.status(501).send({ error: 'Streaming not supported by current provider' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Save user message
    await chatMessageRepository.save({
      id: randomUUID(),
      userId,
      projectId: null,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    });

    // Load recent history for context
    const history = await chatMessageRepository.listByUser(userId, 20);

    const llmMessages: LLMMessage[] = [
      { role: 'system', content: TECH_LEAD_SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let fullContent = '';

    try {
      const stream = provider.chatStream(llmMessages, { temperature: 0.7 });
      for await (const chunk of stream) {
        fullContent += chunk;
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Save assistant reply
      await chatMessageRepository.save({
        id: randomUUID(),
        userId,
        projectId: null,
        role: 'assistant',
        content: fullContent,
        createdAt: new Date(),
      });

      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : String(err) })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // ── Chat session endpoints ──

  fastify.get('/api/chat/sessions', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const sessions = await chatSessionRepository.listByUser(userId);
    return reply.send({ sessions });
  });

  fastify.post('/api/chat/sessions', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const body = request.body as { title?: string };
    const now = new Date();
    const session = await chatSessionRepository.create({
      id: randomUUID(),
      userId,
      title: body.title || 'New Chat',
      createdAt: now,
      updatedAt: now,
    });

    return reply.status(201).send({ session });
  });

  fastify.get('/api/chat/sessions/:id', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };
    const session = await chatSessionRepository.findById(id);

    if (!session || session.userId !== userId) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const messages = await chatMessageRepository.listBySession(id);
    return reply.send({ session, messages });
  });

  // ── Tech Lead chat endpoint ──

  fastify.post('/api/chat/techlead', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const body = request.body as { sessionId?: string; content?: string };

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return reply.status(400).send({ error: 'sessionId is required' });
    }
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return reply.status(400).send({ error: 'content is required' });
    }

    try {
      // Verify session belongs to user
      const session = await chatSessionRepository.findById(body.sessionId);
      if (!session || session.userId !== userId) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      const now = new Date();

      // Save user message
      await chatMessageRepository.save({
        id: randomUUID(),
        userId,
        projectId: null,
        sessionId: body.sessionId,
        role: 'user',
        content: body.content.trim(),
        createdAt: now,
      });

      // Touch session updatedAt
      await chatSessionRepository.touch(body.sessionId);

      // Auto-title from first message
      if (session.title === 'New Chat') {
        const titlePreview = body.content.trim().slice(0, 50);
        await chatSessionRepository.updateTitle(body.sessionId, titlePreview);
      }

      // Load conversation history for context
      const history = await chatMessageRepository.listBySession(body.sessionId);

      // Build LLM messages
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: TECH_LEAD_SYSTEM_PROMPT },
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // Call LLM
      const result = await agentExecutor.getProvider().chat(llmMessages, { temperature: 0.7 });

      if (result.isFail()) {
        return reply.status(500).send({ error: result.error.message });
      }

      const replyContent = result.value.content;

      // Save assistant reply
      await chatMessageRepository.save({
        id: randomUUID(),
        userId,
        projectId: null,
        sessionId: body.sessionId,
        role: 'assistant',
        content: replyContent,
        createdAt: new Date(),
      });

      return reply.send({ reply: replyContent });
    } catch (err) {
      return reply
        .status(500)
        .send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Streaming Tech Lead endpoint (SSE) ──

  fastify.get('/api/chat/techlead/stream', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { sessionId, content } = request.query as { sessionId?: string; content?: string };

    if (!sessionId || typeof sessionId !== 'string') {
      return reply.status(400).send({ error: 'sessionId is required' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return reply.status(400).send({ error: 'content is required' });
    }

    // Verify session belongs to user
    const session = await chatSessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Check if provider supports streaming
    const provider = agentExecutor.getProvider();
    if (!provider.chatStream) {
      return reply.status(501).send({ error: 'Streaming not supported by current provider' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const now = new Date();

    // Save user message
    await chatMessageRepository.save({
      id: randomUUID(),
      userId,
      projectId: null,
      sessionId,
      role: 'user',
      content: content.trim(),
      createdAt: now,
    });

    // Touch session updatedAt
    await chatSessionRepository.touch(sessionId);

    // Auto-title from first message
    if (session.title === 'New Chat') {
      const titlePreview = content.trim().slice(0, 50);
      await chatSessionRepository.updateTitle(sessionId, titlePreview);
    }

    // Load conversation history
    const history = await chatMessageRepository.listBySession(sessionId);

    // Build LLM messages
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: TECH_LEAD_SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let fullContent = '';

    try {
      const stream = provider.chatStream(llmMessages, { temperature: 0.7 });
      for await (const chunk of stream) {
        fullContent += chunk;
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Save assistant reply
      await chatMessageRepository.save({
        id: randomUUID(),
        userId,
        projectId: null,
        sessionId,
        role: 'assistant',
        content: fullContent,
        createdAt: new Date(),
      });

      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : String(err) })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });
}
