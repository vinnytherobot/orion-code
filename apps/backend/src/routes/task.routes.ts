import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';

export async function taskRoutes(app: FastifyInstance, deps: AppDeps) {
  const { planUseCase, taskRepository: taskRepo } = deps;

  app.get('/api/tasks/stats/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const allTasks = await taskRepo.findAll();
    const tasks = allTasks.filter(t => t.toJSON().projectId === projectId);
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.toJSON().status.value === 'pending').length,
      running: tasks.filter(t => t.toJSON().status.value === 'running').length,
      completed: tasks.filter(t => t.toJSON().status.value === 'completed').length,
      failed: tasks.filter(t => t.toJSON().status.value === 'failed').length,
    };
    return reply.send({ stats });
  });

  app.get('/api/tasks', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };
    let tasks = await taskRepo.findAll();
    if (projectId) {
      tasks = tasks.filter(t => t.toJSON().projectId === projectId);
    }
    return reply.send({
      tasks: tasks.map(t => {
        const props = t.toJSON();
        return {
          id: props.id.toString(),
          projectId: props.projectId,
          title: props.title,
          description: props.description,
          status: props.status.value,
          assignedAgentId: props.assignedAgentId,
          parentTaskId: props.parentTaskId,
          dependencies: [...props.dependencies],
          result: props.result,
          createdAt: props.createdAt.toISOString(),
          updatedAt: props.updatedAt.toISOString(),
        };
      }),
    });
  });

  app.post('/api/tasks', async (request, reply) => {
    const { projectId, title, description } = request.body as { projectId: string; title: string; description: string };
    if (!projectId || !title) {
      return reply.status(400).send({ error: 'projectId and title are required' });
    }

    const result = await planUseCase.execute({
      projectId,
      tasks: [{ title, description: description || title }],
    });
    if (result.isFail()) {
      return reply.status(400).send({ error: result.error.message });
    }
    return reply.status(201).send({ task: result.value.tasks[0] });
  });

  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }
    const props = task.toJSON();
    return reply.send({
      task: {
        id: props.id.toString(),
        projectId: props.projectId,
        title: props.title,
        description: props.description,
        status: props.status.value,
        assignedAgentId: props.assignedAgentId,
        parentTaskId: props.parentTaskId,
        dependencies: [...props.dependencies],
        result: props.result,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
      },
    });
  });

  app.put('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, assignedAgent } = request.body as { status?: string; assignedAgent?: string };
    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (status) {
      const startResult = task.start();
      if (startResult.isFail()) {
        return reply.status(400).send({ error: startResult.error.message });
      }
    }

    if (assignedAgent) {
      const assignResult = task.assignTo(assignedAgent);
      if (assignResult.isFail()) {
        return reply.status(400).send({ error: assignResult.error.message });
      }
    }

    await taskRepo.save(task);
    const props = task.toJSON();
    return reply.send({
      task: {
        id: props.id.toString(),
        projectId: props.projectId,
        title: props.title,
        description: props.description,
        status: props.status.value,
        assignedAgentId: props.assignedAgentId,
        parentTaskId: props.parentTaskId,
        dependencies: [...props.dependencies],
        result: props.result,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
      },
    });
  });

  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await taskRepo.delete(id);
    return reply.send({ success: true });
  });
}
