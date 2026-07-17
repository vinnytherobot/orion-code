import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';

export async function orchestrationRoutes(fastify: FastifyInstance, deps: AppDeps) {
  const { orchestrator } = deps;

  fastify.post('/api/projects/:projectId/orchestration/execute', async (request, reply) => {
    const { tasks } = request.body as { tasks: any[] };

    const result = await orchestrator.executePlan(tasks);
    if (result.isFail()) {
      return reply.status(400).send({ success: false, error: result.error.message });
    }
    return reply.send({ success: true });
  });

  fastify.get('/api/projects/:projectId/orchestration/status', async (_request, reply) => {
    const agents = await orchestrator.getAvailableAgents();
    const nextTask = await orchestrator.getNextTask();
    return reply.send({
      success: true,
      data: { availableAgents: agents.length, nextTask: nextTask ?? undefined },
    });
  });

  fastify.post('/api/orchestration/assign', async (request, reply) => {
    const { taskId, agentId } = request.body as { taskId: string; agentId: string };
    const result = await orchestrator.assignTask(taskId, agentId);
    if (result.isFail()) {
      return reply.status(400).send({ success: false, error: result.error.message });
    }
    return reply.send({ success: true });
  });

  fastify.post('/api/orchestration/tasks/:taskId/complete', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const { result } = request.body as { result: string };
    const opResult = await orchestrator.reportTaskComplete(taskId, result);
    if (opResult.isFail()) {
      return reply.status(404).send({ success: false, error: opResult.error.message });
    }
    return reply.send({ success: true });
  });

  fastify.post('/api/orchestration/tasks/:taskId/fail', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const { reason } = request.body as { reason: string };
    const opResult = await orchestrator.reportTaskFailed(taskId, reason);
    if (opResult.isFail()) {
      return reply.status(404).send({ success: false, error: opResult.error.message });
    }
    return reply.send({ success: true });
  });
}
