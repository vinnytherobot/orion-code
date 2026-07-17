import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Agent } from '@orion/domain';
import type { AppDeps } from '../container.js';

export async function agentRoutes(app: FastifyInstance, deps: AppDeps) {
  const { orchestrator, agentRepository: agentRepo } = deps;

  app.get('/api/agents', async (_request, reply) => {
    const agents = await agentRepo.findAll();
    return reply.send({
      agents: agents.map(a => {
        const props = a.toJSON();
        return {
          id: props.id,
          name: props.name,
          role: props.role,
          status: props.status.value,
          capabilities: [...props.permissions],
          currentTaskId: props.currentTaskId,
          createdAt: props.createdAt.toISOString(),
          updatedAt: props.updatedAt.toISOString(),
        };
      }),
    });
  });

  app.post('/api/agents', async (request, reply) => {
    const { name, role, capabilities, projectId } = request.body as {
      name: string; role: string; capabilities?: string[]; projectId?: string;
    };
    if (!name || !role) {
      return reply.status(400).send({ error: 'name and role are required' });
    }

    const agent = Agent.create({
      id: randomUUID(),
      name,
      projectId: projectId || 'default',
      role,
      permissions: capabilities || [],
    });
    await agentRepo.save(agent);
    return reply.status(201).send({ agent: { id: agent.id, name: agent.name, role: agent.role } });
  });

  app.get('/api/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await agentRepo.findById(id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    const props = agent.toJSON();
    return reply.send({
      agent: {
        id: props.id.toString(),
        name: props.name,
        role: props.role,
        status: props.status.value,
        capabilities: [...props.permissions],
        currentTaskId: props.currentTaskId,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
      },
    });
  });

  app.post('/api/agents/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { taskId } = request.body as { taskId: string };
    await orchestrator.assignTask(taskId, id);
    return reply.send({ success: true });
  });
}
