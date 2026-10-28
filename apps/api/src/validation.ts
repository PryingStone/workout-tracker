import { z } from 'zod';
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Use a valid calendar date');
const text = z.string().trim().min(1).max(120);
export const profile = z.object({ name: text }).strict();
export const register = z
  .object({
    name: text,
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(10)
      .max(72)
      .refine(
        (v) => Buffer.byteLength(v, 'utf8') <= 72,
        'Password must be at most 72 UTF-8 bytes',
      ),
  })
  .strict();
export const login = register.omit({ name: true });
export const exercise = z
  .object({
    name: text,
    sets: z.number().int().min(1).max(100),
    reps: z.number().int().min(0).max(1000),
    weightKg: z.number().min(0).max(1000),
    durationMinutes: z.number().min(0).max(1440),
  })
  .strict();
export const workout = z
  .object({
    name: text,
    type: z.enum([
      'strength',
      'running',
      'walking',
      'cycling',
      'yoga',
      'other',
    ]),
    date,
    durationMinutes: z.number().int().min(1).max(1440),
    exercises: z.array(exercise).max(100).default([]),
    notes: z.string().max(2000).default(''),
  })
  .strict();
export const record = z
  .object({
    date,
    steps: z.number().int().min(0).max(200000).optional(),
    weightKg: z.number().min(20).max(400).optional(),
    heartRateBpm: z.number().int().min(30).max(240).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.steps !== undefined ||
      v.weightKg !== undefined ||
      v.heartRateBpm !== undefined,
    'Enter at least one measurement',
  );
export const goal = z
  .object({
    metric: z.enum(['steps', 'duration', 'workouts']),
    period: z.enum(['daily', 'weekly']),
    target: z.number().int().min(1).max(1400000),
  })
  .strict();
export const schedule = z
  .object({
    name: text,
    scheduledAt: z.iso.datetime({ offset: true }),
    status: z.enum(['scheduled', 'completed', 'missed']).default('scheduled'),
  })
  .strict();
export const reminder = z
  .object({
    title: text,
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    enabled: z.boolean(),
  })
  .strict();
