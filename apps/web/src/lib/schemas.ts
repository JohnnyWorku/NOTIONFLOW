import { z } from 'zod';
export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  priority: z.string().max(100).optional(),
  due: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  notes: z.string().max(2000).optional(),
});
export type TaskForm = z.infer<typeof taskSchema>;
