import { z } from 'zod';

export const CreateTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string(),
  dependencies: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'planning', 'running', 'waiting', 'review', 'testing', 'completed', 'failed', 'cancelled']).optional(),
  assignedAgent: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
