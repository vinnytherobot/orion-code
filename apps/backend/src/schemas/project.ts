import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  path: z.string(),
  description: z.string().optional(),
  architecture: z.enum(['ddd', 'clean', 'mvc', 'hexagonal']).default('ddd'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  architecture: z.enum(['ddd', 'clean', 'mvc', 'hexagonal']).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
