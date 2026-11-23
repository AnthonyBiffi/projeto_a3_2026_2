import { z } from 'zod';

const scheduleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  appointment_duration: z.number().int().min(5).max(240),
  break_interval: z.number().int().min(0).max(120).optional().default(0),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const createDoctorSchema = z.object({
  name: z.string().trim().min(3).max(150),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  specialty: z.string().trim().min(2).max(100),
  phone: z.string().optional(),
  crm: z.string().trim().min(3).max(30),
  appointment_type: z.enum(['presencial', 'online', 'ambas']),
  schedules: z.array(scheduleSchema).min(1),
});

export const updateDoctorSchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  specialty: z.string().trim().min(2).max(100).optional(),
  phone: z.string().optional(),
  crm: z.string().trim().min(3).max(30).optional(),
  appointment_type: z.enum(['presencial', 'online', 'ambas']).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Informe pelo menos um campo');

export const statusSchema = z.object({
  active: z.boolean(),
});

export const replaceSchedulesSchema = z.object({
  schedules: z.array(scheduleSchema),
});
