import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';

export async function orchestrationRoutes(fastify: FastifyInstance, deps: AppDeps) {
  const { orchestrator, taskRepository: taskRepo } = deps;

  /**
   * Server-Sent Events stream of orchestration events for a given
   * project. The TUI subscribes to this endpoint to render live
   * progress (task started/completed/failed, agent status changes).
   *
   * Events emitted:
   *   - task:started    { taskId, agentId }
   *   - task:completed  { taskId, result }
   *   - task:failed     { taskId, reason }
   *   - wave:completed  { waveIndex, taskIds }
   *   - plan:completed  { projectId }
   *   - plan:failed     { projectId, reason }
   *
   * Connection is kept open until the client disconnects or the
   * plan completes.
   */
  fastify.get('/api/projects/:projectId/orchestration/events', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event: string, data: unknown): void => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const handler = (payload: unknown): void => {
      const event = payload as { taskId?: string; agentId?: string };
      if (event && typeof event === 'object' && 'taskId' in event) {
        send('task', payload);
      } else {
        send('orchestrator', payload);
      }
    };
    const onPlanComplete = (payload: unknown): void => {
      const p = payload as { projectId?: string };
      if (p?.projectId === projectId) {
        send('plan:completed', payload);
        cleanup();
        reply.raw.end();
      }
    };
    const onPlanFailed = (payload: unknown): void => {
      const p = payload as { projectId?: string };
      if (p?.projectId === projectId) {
        send('plan:failed', payload);
        cleanup();
        reply.raw.end();
      }
    };

    const events = ['task:started', 'task:completed', 'task:failed', 'wave:completed'];
    for (const e of events) orchestrator.on(e, handler);
    orchestrator.on('plan:completed', onPlanComplete);
    orchestrator.on('plan:failed', onPlanFailed);

    const heartbeat = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 15_000);

    const cleanup = (): void => {
      clearInterval(heartbeat);
      for (const e of events) orchestrator.off(e, handler);
      orchestrator.off('plan:completed', onPlanComplete);
      orchestrator.off('plan:failed', onPlanFailed);
    };

    request.raw.on('close', cleanup);
    send('ready', { projectId });
  });

  fastify.post('/api/projects/:projectId/orchestration/execute', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { tasks } = request.body as { tasks: any[] };

    const result = await orchestrator.executePlan({ projectId, tasks });
    if (result.isFail()) {
      return reply.status(400).send({ success: false, error: result.error.message });
    }
    return reply.send({ success: true });
  });

  fastify.get('/api/projects/:projectId/orchestration/status', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const agents = await orchestrator.getAvailableAgents();
    const allTasks = await taskRepo.findAll();
    const projectTasks = allTasks.filter((t) => t.projectId === projectId);
    const runningAgents = agents.length;
    const pendingTasks = projectTasks.filter((t) => t.status.value === 'pending').length;
    const runningTasks = projectTasks.filter((t) => t.status.value === 'running').length;
    const completedTasks = projectTasks.filter((t) => t.status.value === 'completed').length;
    const failedTasks = projectTasks.filter((t) => t.status.value === 'failed').length;
    return reply.send({
      runningAgents,
      pendingTasks,
      runningTasks,
      completedTasks,
      failedTasks,
      totalTasks: projectTasks.length,
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
