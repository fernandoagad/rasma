import { z } from "zod";

export const POSITION_OPTIONS = [
  "Psicólogo/a Infantil",
  "Psicólogo/a Clínico/a",
  "Terapeuta Ocupacional Pediátrico/a",
  "Fonoaudiólogo/a Infantil",
  "Psiquiatra Infanto-Juvenil",
  "Coordinador/a Clínico/a",
  "Asistente de Admisión y Agenda",
  "Orientador/a Escolar Enlace",
  "Trabajador/a Social",
  "Pasantía Universitaria",
] as const;

export const applicantFormSchema = z.object({
  name: z.string().min(2, "Ingrese su nombre completo.").max(120),
  email: z.string().email("Correo electrónico inválido."),
  phone: z.string().min(7, "Ingrese un número de teléfono válido.").max(20),
  positions: z.array(z.string()).min(1, "Seleccione al menos un puesto."),
});

export const applicantStatusSchema = z.object({
  status: z.enum(["nuevo", "en_revision", "entrevista", "aceptado", "rechazado", "en_espera"]),
});

export const applicantNoteSchema = z.object({
  content: z.string().min(1, "Ingrese el contenido de la nota.").max(2000),
});

export const applicantEmailSchema = z.object({
  subject: z.string().min(1, "Ingrese el asunto.").max(200),
  body: z.string().min(1, "Ingrese el mensaje.").max(5000),
});
