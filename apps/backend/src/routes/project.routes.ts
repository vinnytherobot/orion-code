import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';

export async function projectRoutes(app: FastifyInstance, deps: AppDeps) {
  const { projectUseCase } = deps;

  app.get('/api/projects', async (request, reply) => {
    const result = await projectUseCase.findAll(request.userId!);
    if (result.isFail()) {
      return reply.status(500).send({ error: result.error.message });
    }
    return reply.send({ projects: result.value });
  });

  app.post('/api/projects', async (request, reply) => {
    const { name, description, path } = request.body as { name: string; description?: string; path?: string };
    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const result = await projectUseCase.create({
      userId: request.userId!,
      name,
      description,
      path,
    });
    if (result.isFail()) {
      return reply.status(400).send({ error: result.error.message });
    }
    return reply.status(201).send({ project: result.value });
  });

  app.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await projectUseCase.findById(id, request.userId!);
    if (result.isFail() || !result.value) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return reply.send({ project: result.value });
  });

  app.put('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, description } = request.body as { name?: string; description?: string };
    const result = await projectUseCase.update(id, request.userId!, { name, description });
    if (result.isFail() || !result.value) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return reply.send({ project: result.value });
  });

  app.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await projectUseCase.delete(id);
    if (result.isFail() || !result.value) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return reply.send({ success: true });
  });
}
