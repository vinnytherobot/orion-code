import type { FastifyInstance } from 'fastify';
import { CreateTaskSchema, UpdateTaskSchema } from '../schemas/task.js';
import { TaskService } from '../services/task.service.js';
import type { AppDeps } from '../container.js';

export async function taskRoutes(app: FastifyInstance, _deps: AppDeps) {
  const taskService = new TaskService();

  // GET /api/tasks
  app.get('/api/tasks', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };
    const tasks = await taskService.findAll(request.userId!, projectId);
    return reply.send({ tasks });
  });

  // POST /api/tasks
  app.post('/api/tasks', async (request, reply) => {
    const result = CreateTaskSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues });
    }

    const task = await taskService.create(request.userId!, result.data.projectId, result.data);
    return reply.status(201).send({ task });
  });

  // GET /api/tasks/:id
  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await taskService.findById(id);

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task });
  });

  // PUT /api/tasks/:id
  app.put('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = UpdateTaskSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues });
    }

    const task = await taskService.update(id, result.data);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task });
  });

  // DELETE /api/tasks/:id
  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await taskService.delete(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ success: true });
  });

  // GET /api/tasks/stats/:projectId
  app.get('/api/tasks/stats/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const stats = await taskService.getProjectStats(projectId);
    return reply.send({ stats });
  });
}
