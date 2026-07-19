import type { FastifyInstance } from 'fastify';
import type { ProviderUseCase } from '@orion/application';

export async function providerRoutes(app: FastifyInstance, providerUseCase: ProviderUseCase) {
  app.get('/api/providers', async (_request, reply) => {
    const providers = providerUseCase.getAvailableProviders();
    return reply.send({ providers });
  });

  app.get('/api/provider', async (_request, reply) => {
    const current = providerUseCase.getCurrentProvider();
    return reply.send({ provider: current });
  });

  app.post('/api/provider', async (request, reply) => {
    const { provider: name, apiKey, model } = request.body as { provider: string; apiKey?: string; model?: string };

    if (!name) {
      return reply.status(400).send({ error: 'provider name is required' });
    }

    try {
      const provider = await providerUseCase.switchProvider(name, apiKey, model);
      return reply.send({ success: true, provider });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to switch provider' });
    }
  });
}
