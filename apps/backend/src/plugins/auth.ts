import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: { id: string; name: string; email: string };
  }

  interface FastifyInstance {
    authService: AuthService;
  }
}

type AuthPluginOptions = {
  authService: AuthService;
};

export async function authPlugin(fastify: FastifyInstance, options: AuthPluginOptions): Promise<void> {
  const { authService } = options;

  // Make authService available
  fastify.decorate('authService', authService);

  // Auth middleware hook
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const apiKey = request.headers['x-api-key'] as string;

    // Skip auth for public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/health'];
    if (publicRoutes.some(route => request.url.startsWith(route))) {
      return;
    }

    // API Key auth
    if (apiKey) {
      const user = await authService.validateApiKey(apiKey);
      if (!user) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
      request.userId = user.id;
      request.user = user;
      return;
    }

    // JWT auth
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = authService.verifyJwt(token);

      if (!payload || payload.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }

      const user = await authService.getUserById(payload.sub);
      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      request.userId = user.id;
      request.user = user;
      return;
    }

    return reply.status(401).send({ error: 'Authentication required' });
  });
}
