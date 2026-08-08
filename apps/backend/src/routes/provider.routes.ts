import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';
import { createProvider, getProviderInfo } from '@orion/infrastructure';

export async function providerRoutes(app: FastifyInstance, deps: AppDeps) {
  const { providerUseCase, userRepository, agentExecutor } = deps;

  app.get('/api/providers', async (_request, reply) => {
    const providers = providerUseCase.getAvailableProviders();
    return reply.send({ providers });
  });

  app.get('/api/provider', async (request, reply) => {
    // Return the user's saved provider if authenticated, otherwise global
    if (request.userId) {
      const userConfig = await userRepository.getProviderConfig(request.userId);
      if (userConfig) {
        return reply.send({ provider: { name: userConfig.name, model: userConfig.model ?? '' } });
      }
    }
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

      // Persist to user's DB record
      if (request.userId) {
        await userRepository.setProviderConfig(request.userId, {
          name: provider.name,
          apiKey: apiKey ?? undefined,
          model: provider.model,
        });
      }

      return reply.send({ provider });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to switch provider' });
    }
  });

  /**
   * Syncs the global AgentExecutor with the authenticated user's saved
   * provider config. Called on login and can be called on any request
   * to ensure the executor matches the user's preference.
   */
  app.post('/api/provider/sync', async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const userConfig = await userRepository.getProviderConfig(request.userId);
    if (!userConfig) {
      return reply.send({ synced: false, message: 'No saved provider config' });
    }

    const info = getProviderInfo(userConfig.name);
    if (!info) {
      return reply.send({ synced: false, message: `Unknown provider: ${userConfig.name}` });
    }

    const provider = createProvider(userConfig.name, {
      apiKey: userConfig.apiKey || 'ollama',
      baseUrl: info.defaultBaseUrl,
      model: userConfig.model || info.defaultModel,
    });
    agentExecutor.setProvider(provider);

    return reply.send({ synced: true, provider: { name: provider.name, model: provider.defaultModel } });
  });
}
