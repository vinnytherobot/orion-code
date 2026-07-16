import type { FastifyInstance } from 'fastify';
import { AgentService } from '../services/agent.service.js';
import type { AppDeps } from '../container.js';

export async function agentRoutes(app: FastifyInstance, _deps: AppDeps) {
  const agentService = new AgentService();

  // GET /api/agents
  app.get('/api/agents', async (_request, reply) => {
    const agents = await agentService.findAll();
    return reply.send({ agents });
  });

  // GET /api/agents/stats
  app.get('/api/agents/stats', async (_request, reply) => {
    const stats = await agentService.getStats();
    return reply.send({ stats });
  });

  // GET /api/agents/:id
  app.get('/api/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await agentService.findById(id);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ agent });
  });

  // POST /api/agents/:id/assign
  app.post('/api/agents/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { taskId } = request.body as { taskId: string };

    if (!taskId) {
      return reply.status(400).send({ error: 'taskId required' });
    }

    const agent = await agentService.assignTask(id, taskId);
    if (!agent) {
      return reply.status(400).send({ error: 'Agent not available' });
    }

    return reply.send({ agent });
  });

  // POST /api/agents/:id/complete
  app.post('/api/agents/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { result } = request.body as { result: string };

    const agent = await agentService.completeTask(id, result || 'Completed');
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ agent });
  });

  // POST /api/agents/:id/reset
  app.post('/api/agents/:id/reset', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await agentService.reset(id);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ agent });
  });

  // POST /api/agents/initialize/:projectId
  app.post('/api/agents/initialize/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const agents = await agentService.initializeProjectAgents(projectId);
    return reply.status(201).send({ agents });
  });
}
