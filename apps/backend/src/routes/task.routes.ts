import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../container.js';

export async function taskRoutes(app: FastifyInstance, deps: AppDeps) {
  const { planUseCase, taskRepository: taskRepo } = deps;

  app.get('/api/tasks', async (_request, reply) => {
    const tasks = await taskRepo.findAll();
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

  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await taskRepo.delete(id);
    return reply.send({ success: true });
  });
}
