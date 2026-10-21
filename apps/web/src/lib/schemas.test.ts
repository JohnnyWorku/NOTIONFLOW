import { describe, expect, it } from 'vitest';
import { taskSchema } from './schemas';

describe('taskSchema', () => {
  it('requires a title', () => expect(taskSchema.safeParse({ title: '  ' }).success).toBe(false));
  it('accepts valid input', () => expect(taskSchema.safeParse({ title: 'Read', due: '2026-05-01' }).success).toBe(true));
  it('rejects bad dates', () => expect(taskSchema.safeParse({ title: 'x', due: 'nope' }).success).toBe(false));
});
