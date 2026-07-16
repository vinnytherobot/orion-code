import type { FastifyInstance } from 'fastify';
import { LoginSchema, RegisterSchema } from '../schemas/auth.js';
import type { AppDeps } from '../container.js';
import type { AuthService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance, _deps: AppDeps, authService: AuthService) {
  // POST /api/auth/register
  app.post('/api/auth/register', async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues });
    }

    try {
      const { user, tokens } = await authService.register(result.data);
      return reply.status(201).send({ user, tokens });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (request, reply) => {
    const result = LoginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues });
    }

    try {
      const { user, tokens } = await authService.login(result.data);
      return reply.send({ user, tokens });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.status(401).send({ error: message });
    }
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    try {
      const tokens = await authService.refreshTokens(refreshToken);
      return reply.send(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refresh failed';
      return reply.status(401).send({ error: message });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return reply.send({ success: true });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const user = await authService.getUserById(request.userId);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });

  // POST /api/auth/api-keys
  app.post('/api/auth/api-keys', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { name, expiresAt } = request.body as { name: string; expiresAt?: string };

    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const expires = expiresAt ? new Date(expiresAt) : undefined;
    const apiKey = await authService.createApiKey(request.userId, name, expires);

    return reply.status(201).send({
      ...apiKey,
      message: 'Save this API key securely. It will not be shown again.',
    });
  });

  // GET /api/auth/api-keys
  app.get('/api/auth/api-keys', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const keys = await authService.listApiKeys(request.userId);
    return reply.send({ apiKeys: keys });
  });

  // DELETE /api/auth/api-keys/:id
  app.delete('/api/auth/api-keys/:id', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { id } = request.params as { id: string };
    const deleted = await authService.deleteApiKey(id, request.userId);

    if (!deleted) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    return reply.send({ success: true });
  });
}
