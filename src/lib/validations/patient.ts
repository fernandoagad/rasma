import { z } from "zod";

export const patientFormSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio.").max(100),
  lastName: z.string().min(1, "El apellido es obligatorio.").max(100),
  rut: z.string().max(12).optional().or(z.literal("")),
  email: z.string().email("Correo electrónico inválido.").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["masculino", "femenino", "otro", "no_especificado"]).optional(),
  address: z.string().max(500).optional().or(z.literal("")),
  emergencyContactName: z.string().max(100).optional().or(z.literal("")),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal("")),
  emergencyContactRelation: z.string().max(50).optional().or(z.literal("")),
  insuranceProvider: z.string().max(100).optional().or(z.literal("")),
  insuranceNumber: z.string().max(50).optional().or(z.literal("")),
  referralSource: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  primaryTherapistId: z.string().optional().or(z.literal("")),
  status: z.enum(["activo", "inactivo", "alta"]).default("activo"),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
