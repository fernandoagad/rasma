import { z } from "zod";

export const internCreateSchema = z.object({
  university: z.string().min(1, "La universidad es obligatoria.").max(200),
  program: z.string().min(1, "El programa es obligatorio.").max(200),
  supervisorId: z.string().min(1, "Seleccione un supervisor."),
  startDate: z.string().min(1, "Seleccione una fecha de inicio."),
  endDate: z.string().optional(),
  weeklyHours: z.coerce.number().min(1, "Mínimo 1 hora semanal.").max(45, "Máximo 45 horas semanales."),
});

export const internHoursSchema = z.object({
  date: z.string().min(1, "Seleccione una fecha."),
  minutes: z.coerce.number().min(1, "Mínimo 1 minuto.").max(720, "Máximo 12 horas."),
  description: z.string().min(1, "La descripción es obligatoria.").max(500),
});

export const interviewScheduleSchema = z.object({
  date: z.string().min(1, "Seleccione una fecha."),
  time: z.string().min(1, "Seleccione una hora."),
  durationMinutes: z.coerce.number().refine((v) => [30, 45, 60].includes(v), "Duración inválida."),
  addMeetLink: z.boolean().default(false),
});
