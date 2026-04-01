import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "La contrasena debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "Debe incluir al menos una letra mayuscula.")
  .regex(/[0-9]/, "Debe incluir al menos un numero.")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un caracter especial.");

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Correo electrónico inválido."),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria."),
});

export const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Correo electrónico inválido."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria."),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const changeEmailSchema = z.object({
  newEmail: z
    .string()
    .min(1, "El nuevo correo es obligatorio.")
    .email("Correo electrónico inválido."),
  currentPassword: z.string().min(1, "La contraseña es obligatoria."),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    email: z
      .string()
      .min(1, "El correo electronico es obligatorio.")
      .email("Correo electronico invalido."),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;
