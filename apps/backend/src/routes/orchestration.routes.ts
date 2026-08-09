import type { FastifyInstance } from 'fastify';
import { Task } from '@orion/domain';
import type { AppDeps } from '../container.js';

export async function orchestrationRoutes(fastify: FastifyInstance, deps: AppDeps) {
  const { orchestrator, taskRepository: taskRepo, plannerService } = deps;

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

  /**
   * SSE stream of real-time agent output for a project. Each event
   * contains the agent's thinking, tool calls, and results as they
   * happen — similar to Claude Code / MiMo Code streaming.
   */
  fastify.get('/api/projects/:projectId/orchestration/stream', async (request, reply) => {
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

    const onAgentOutput = (payload: unknown): void => {
      const p = payload as { taskId?: string };
      // Only forward events for tasks in this project.
      if (p?.taskId) send('agent:output', payload);
    };
    const onTaskStarted = (payload: unknown): void => send('task:started', payload);
    const onTaskCompleted = (payload: unknown): void => send('task:completed', payload);
    const onTaskFailed = (payload: unknown): void => send('task:failed', payload);
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

    orchestrator.on('agent:output', onAgentOutput);
    orchestrator.on('task:started', onTaskStarted);
    orchestrator.on('task:completed', onTaskCompleted);
    orchestrator.on('task:failed', onTaskFailed);
    orchestrator.on('plan:completed', onPlanComplete);
    orchestrator.on('plan:failed', onPlanFailed);

    const heartbeat = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 15_000);

    const cleanup = (): void => {
      clearInterval(heartbeat);
      orchestrator.off('agent:output', onAgentOutput);
      orchestrator.off('task:started', onTaskStarted);
      orchestrator.off('task:completed', onTaskCompleted);
      orchestrator.off('task:failed', onTaskFailed);
      orchestrator.off('plan:completed', onPlanComplete);
      orchestrator.off('plan:failed', onPlanFailed);
    };

    request.raw.on('close', cleanup);
    send('ready', { projectId });
  });

  fastify.post('/api/projects/:projectId/orchestration/execute', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as { request?: string; tasks?: Array<{ title: string; description: string; role?: string; dependencies?: string[] }> };

    let tasks = body.tasks;

    // If a free-text request is provided, use the PlannerService to
    // decompose it into subtasks with roles and dependencies.
    if (!tasks && body.request) {
      const planResult = await plannerService.plan({
        rootPath: process.cwd(),
        request: body.request,
      });
      if (planResult.isFail()) {
        return reply.status(400).send({ success: false, error: planResult.error.message });
      }
      const planned = planResult.value;

      // PlannerService uses local IDs (e.g. "0-architect") for
      // dependencies. We need to create tasks with real UUIDs and
      // remap the dependencies.
      const localIdToDbId = new Map<string, string>();

      // First pass: create all tasks (without dependencies).
      for (const sub of planned.subtasks) {
        const task = Task.create({
          projectId,
          title: sub.title,
          description: sub.description,
          role: sub.role,
        });
        await taskRepo.save(task);
        localIdToDbId.set(sub.localId, task.id.toString());
      }

      // Second pass: resolve and set dependencies using real UUIDs.
      for (const sub of planned.subtasks) {
        const dbId = localIdToDbId.get(sub.localId);
        if (!dbId) continue;
        const resolvedDeps = sub.dependencies
          .map((localDep) => localIdToDbId.get(localDep))
          .filter((id): id is string => !!id);
        if (resolvedDeps.length > 0) {
          const task = await taskRepo.findById(dbId);
          if (task) {
            task.setDependencies(resolvedDeps);
            await taskRepo.save(task);
          }
        }
      }

      // Kick off the orchestrator run loop (fire-and-forget).
      void orchestrator.runProject(projectId).catch((err) => {
        request.log.error({ err, projectId }, 'orchestration failed');
      });

      return reply.send({ success: true });
    }

    if (!tasks || tasks.length === 0) {
      return reply.status(400).send({ success: false, error: 'Provide either { request } or { tasks }' });
    }

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
