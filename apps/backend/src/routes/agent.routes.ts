import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Agent } from '@orion/domain';
import type { AppDeps } from '../container.js';

export async function agentRoutes(app: FastifyInstance, deps: AppDeps) {
  const { orchestrator, agentRepository: agentRepo } = deps;

  app.get('/api/agents/stats', async (_request, reply) => {
    const agents = await agentRepo.findAll();
    const stats = {
      total: agents.length,
      idle: agents.filter(a => a.toJSON().status.value === 'idle').length,
      running: agents.filter(a => a.toJSON().status.value === 'running').length,
      blocked: agents.filter(a => a.toJSON().status.value === 'waiting').length,
      completed: agents.filter(a => a.toJSON().status.value === 'completed').length,
    };
    return reply.send({ stats });
  });

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

  app.post('/api/agents/initialize/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      const existingAgents = await agentRepo.findByProject(projectId);
      if (existingAgents.length > 0) {
        return reply.send({
          agents: existingAgents.map(a => {
            const props = a.toJSON();
            return {
              id: props.id,
              name: props.name,
              role: props.role,
              status: props.status.value,
            };
          }),
        });
      }

      // Create 3 agents per role to enable parallel execution.
      // The orchestrator's maxConcurrentAgents is 4, so 3 agents per
      // role ensures most waves can run fully parallel.
      const AGENTS_PER_ROLE = 3;
      const agentDefinitions = [
        { role: 'planner', permissions: [] },
        { role: 'architect', permissions: [] },
        { role: 'backend', permissions: ['src/'] },
        { role: 'database', permissions: ['src/infrastructure/database/'] },
        { role: 'frontend', permissions: ['src/presentation/'] },
        { role: 'qa', permissions: ['src/', 'tests/'] },
        { role: 'reviewer', permissions: ['src/'] },
        { role: 'devops', permissions: ['docker/', '.github/'] },
        { role: 'security', permissions: ['src/'] },
        { role: 'documentation', permissions: ['docs/', 'README.md'] },
      ];

      const createdAgents: Array<{ id: string; name: string; role: string }> = [];
      for (const def of agentDefinitions) {
        for (let i = 0; i < AGENTS_PER_ROLE; i++) {
          const agent = Agent.create({
            id: randomUUID(),
            name: `${def.role.charAt(0).toUpperCase() + def.role.slice(1)}-${i + 1}`,
            projectId,
            role: def.role,
            permissions: def.permissions,
          });
          await agentRepo.save(agent);
          createdAgents.push({ id: agent.id, name: agent.name, role: agent.role });
        }
      }

      return reply.send({ agents: createdAgents });
    } catch (err) {
      request.log.error({ err, projectId }, 'failed to initialize agents');
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: `Failed to initialize agents: ${message}` });
    }
  });

  app.post('/api/agents/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { taskId } = request.body as { taskId: string };
    if (!taskId) {
      return reply.status(400).send({ error: 'taskId is required' });
    }
    const result = await orchestrator.assignTask(taskId, id);
    if (result.isFail()) {
      return reply.status(400).send({ error: result.error.message });
    }
    const agent = await agentRepo.findById(id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    const props = agent.toJSON();
    return reply.send({
      agent: {
        id: props.id,
        name: props.name,
        role: props.role,
        status: props.status.value,
      },
    });
  });

  app.post('/api/agents/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { result: resultMsg } = request.body as { result?: string };
    const agent = await agentRepo.findById(id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    const props = agent.toJSON();
    if (!props.currentTaskId) {
      return reply.status(400).send({ error: 'Agent has no assigned task' });
    }
    const opResult = await orchestrator.reportTaskComplete(props.currentTaskId, resultMsg || 'Completed');
    if (opResult.isFail()) {
      return reply.status(400).send({ error: opResult.error.message });
    }
    const updated = await agentRepo.findById(id);
    const updatedProps = updated?.toJSON() ?? props;
    return reply.send({
      agent: {
        id: updatedProps.id,
        name: updatedProps.name,
        role: updatedProps.role,
        status: updatedProps.status.value,
      },
    });
  });

  app.post('/api/agents/:id/reset', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await agentRepo.findById(id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    agent.reset();
    await agentRepo.save(agent);
    const props = agent.toJSON();
    return reply.send({
      agent: {
        id: props.id,
        name: props.name,
        role: props.role,
        status: props.status.value,
      },
    });
  });
}
