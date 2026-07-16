import type { FastifyInstance } from 'fastify';
import { CreateProjectSchema, UpdateProjectSchema } from '../schemas/project.js';
import { ProjectService } from '../services/project.service.js';
import type { AppDeps } from '../container.js';

export async function projectRoutes(app: FastifyInstance, _deps: AppDeps) {
  const projectService = new ProjectService();

  // GET /api/projects
  app.get('/api/projects', async (request, reply) => {
    const projects = await projectService.findAll(request.userId!);
    return reply.send({ projects });
  });

  // POST /api/projects
  app.post('/api/projects', async (request, reply) => {
    const result = CreateProjectSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues });
    }

    const project = await projectService.create(request.userId!, result.data);
    return reply.status(201).send({ project });
  });

  // GET /api/projects/:id
  app.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectService.findById(id, request.userId!);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.send({ project });
  });

  // PUT /api/projects/:id
  app.put('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = UpdateProjectSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues });
    }

    const project = await projectService.update(id, request.userId!, result.data);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.send({ project });
  });

  // DELETE /api/projects/:id
  app.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await projectService.delete(id, request.userId!);

    if (!deleted) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.send({ success: true });
  });
}
