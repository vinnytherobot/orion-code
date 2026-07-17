import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';

export async function authRoutes(app: FastifyInstance, deps: AppDeps) {
  const { authUseCase } = deps;

  app.post('/api/auth/register', async (request, reply) => {
    const { name, email, password } = request.body as { name: string; email: string; password: string };

    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Name, email, and password are required' });
    }

    const result = await authUseCase.register({ name, email, password });
    if (result.isFail()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({ user: result.value.user, tokens: result.value.tokens });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const result = await authUseCase.login({ email, password });
    if (result.isFail()) {
      return reply.status(401).send({ error: result.error.message });
    }

    return reply.send({ user: result.value.user, tokens: result.value.tokens });
  });

  app.post('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    const result = await authUseCase.refreshTokens(refreshToken);
    if (result.isFail()) {
      return reply.status(401).send({ error: result.error.message });
    }

    return reply.send(result.value);
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (refreshToken) {
      await authUseCase.logout(refreshToken);
    }
    return reply.send({ success: true });
  });

  app.get('/api/auth/me', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const result = await authUseCase.getUserById(request.userId);
    if (result.isFail() || !result.value) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ user: result.value });
  });

  app.post('/api/auth/api-keys', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { name, expiresAt } = request.body as { name: string; expiresAt?: string };
    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const expires = expiresAt ? new Date(expiresAt) : undefined;
    const result = await authUseCase.createApiKey(request.userId, name, expires);
    if (result.isFail()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      ...result.value,
      message: 'Save this API key securely. It will not be shown again.',
    });
  });

  app.get('/api/auth/api-keys', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const result = await authUseCase.listApiKeys(request.userId);
    if (result.isFail()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({ apiKeys: result.value });
  });

  app.delete('/api/auth/api-keys/:id', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { id } = request.params as { id: string };
    const result = await authUseCase.deleteApiKey(id, request.userId);
    if (result.isFail() || !result.value) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    return reply.send({ success: true });
  });
}
