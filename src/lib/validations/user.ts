import { z } from "zod";

const professionalFields = {
  specialty: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  therapistStatus: z.enum(["evaluando", "disponible", "completo"]).optional(),
  attentionType: z.string().max(200).optional(),
};

export const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(100),
  email: z.string().email("Correo electrónico inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  role: z.enum(["admin", "terapeuta", "recepcionista", "supervisor", "rrhh", "paciente", "invitado"]),
  ...professionalFields,
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(100),
  email: z.string().email("Correo electrónico inválido."),
  role: z.enum(["admin", "terapeuta", "recepcionista", "supervisor", "rrhh", "paciente", "invitado"]),
  active: z.boolean(),
  ...professionalFields,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserValues = z.infer<typeof updateUserSchema>;
