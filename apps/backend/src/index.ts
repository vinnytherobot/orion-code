import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { buildDeps } from './container.js';
import { env } from './env.js';
import { checkDatabaseHealth } from '@orion/infrastructure';
import { agentRoutes } from './routes/agent.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { chatRoutes } from './routes/chat.routes.js';
import { orchestrationRoutes } from './routes/orchestration.routes.js';
import { projectRoutes } from './routes/project.routes.js';
import { providerRoutes } from './routes/provider.routes.js';
import { taskRoutes } from './routes/task.routes.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: { id: string; name: string; email: string };
  }
}

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  const deps = buildDeps(env.JWT_SECRET);

  await fastify.register(helmet, { global: true });

  await fastify.register(rateLimit, {
    global: true,
    max: env.NODE_ENV === 'production' ? 120 : 1000,
    timeWindow: '1 minute',
  });

  const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  await fastify.register(cors, {
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const apiKey = request.headers['x-api-key'] as string;

    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/health',
    ];
    if (publicRoutes.some((route) => request.url.startsWith(route))) {
      return;
    }

    if (apiKey) {
      const result = await deps.authUseCase.validateApiKey(apiKey);
      if (result.isFail() || !result.value) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
      request.userId = result.value.id;
      request.user = result.value;
      return;
    }

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = deps.authUseCase.verifyJwt(token);

      if (!payload || payload.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }

      const userResult = await deps.authUseCase.getUserById(payload.sub);
      if (userResult.isFail() || !userResult.value) {
        return reply.status(401).send({ error: 'User not found' });
      }

      request.userId = userResult.value.id;
      request.user = userResult.value;
      return;
    }

    return reply.status(401).send({ error: 'Authentication required' });
  });

  await fastify.register((instance) => authRoutes(instance, deps));
  await fastify.register((instance) => projectRoutes(instance, deps));
  await fastify.register((instance) => taskRoutes(instance, deps));
  await fastify.register((instance) => agentRoutes(instance, deps));
  await fastify.register((instance) => orchestrationRoutes(instance, deps));
  await fastify.register((instance) => chatRoutes(instance, { chatMessageRepository: deps.chatMessageRepository }));
  await fastify.register((instance) => providerRoutes(instance, deps.providerUseCase));

  // Log every unhandled 4xx/5xx with route + stack so a "Bad Request"
  // bubbling out of a plugin (helmet/rate-limit/etc.) shows up in the
  // server log instead of as an opaque client error.
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
        statusCode: error.statusCode ?? reply.statusCode,
      },
      'unhandled route error',
    );
    const status = error.statusCode ?? 500;
    reply.status(status).send({
      error: error.message || 'Internal Server Error',
      code: error.code,
    });
  });

  fastify.get('/api/health', async () => {
    const dbHealthy = await checkDatabaseHealth();
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      db: dbHealthy ? 'ok' : 'error',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  });

  try {
    await fastify.listen({ port: env.PORT, host: env.HOST });
    console.log(`\n  Orion API Server running on http://${env.HOST}:${env.PORT}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
