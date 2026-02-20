/**
 * Email Template Registry
 *
 * Single source of truth for all email template metadata.
 * Used by email.ts for defaults, admin actions for listing, and preview rendering.
 */

export type TemplateCategory = "auth" | "appointments" | "payments" | "treatment" | "system";

export type TemplateId =
  | "password_reset_link"
  | "password_reset_code"
  | "registration_welcome"
  | "login_alert"
  | "email_change_verify"
  | "password_changed"
  | "welcome_new_user"
  | "admin_password_reset"
  | "appointment_confirmation"
  | "appointment_updated"
  | "appointment_cancellation"
  | "appointment_reminder"
  | "appointment_status"
  | "payment_confirmation"
  | "payment_status"
  | "treatment_plan_created"
  | "treatment_plan_status"
  | "test_email";

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  description: string;
  category: TemplateCategory;
  variables: string[];
  defaultSubject: string;
  defaultBody: string;
  sampleVars: Record<string, string>;
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  auth: "Autenticación",
  appointments: "Citas",
  payments: "Pagos",
  treatment: "Planes de Tratamiento",
  system: "Sistema",
};

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // ============================================================
  // AUTH
  // ============================================================
  {
    id: "password_reset_link",
    label: "Restablecer contraseña (enlace)",
    description: "Se envía cuando el usuario solicita restablecer su contraseña mediante enlace.",
    category: "auth",
    variables: ["resetUrl"],
    defaultSubject: "Restablecer contraseña — RASMA",
    defaultBody: `{{p_start}}Recibimos una solicitud para restablecer su contraseña. Haga clic en el botón de abajo para crear una nueva contraseña.{{p_end}}
{{btn_resetUrl_Restablecer Contraseña}}
{{muted_start}}Este enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.{{muted_end}}`,
    sampleVars: { resetUrl: "https://app.rasma.cl/recuperar?token=abc123" },
  },
  {
    id: "password_reset_code",
    label: "Código de recuperación",
    description: "Se envía con un código de 6 dígitos para recuperar la contraseña.",
    category: "auth",
    variables: ["code"],
    defaultSubject: "{{code}} — Código de recuperación RASMA",
    defaultBody: `{{p_start}}Recibimos una solicitud para restablecer su contraseña. Use el siguiente código de verificación:{{p_end}}
{{code_block}}
{{p_start}}Ingrese este código en la página de recuperación de contraseña para continuar.{{p_end}}
{{muted_start}}Este código expira en 15 minutos. Si no solicitó este cambio, puede ignorar este correo.{{muted_end}}`,
    sampleVars: { code: "847291" },
  },
  {
    id: "registration_welcome",
    label: "Bienvenido/a (registro)",
    description: "Se envía al registrarse con un código de verificación de correo.",
    category: "auth",
    variables: ["userName", "code"],
    defaultSubject: "{{code}} — Verificar correo RASMA",
    defaultBody: `{{p_start}}Hola <strong>{{userName}}</strong>, su cuenta en RASMA ha sido creada exitosamente.{{p_end}}
{{p_start}}Para completar su registro, ingrese el siguiente código de verificación:{{p_end}}
{{code_block}}
{{p_start}}Ingrese este código en la página de registro para verificar su correo electrónico.{{p_end}}
{{muted_start}}Este código expira en 30 minutos. Si no creó esta cuenta, puede ignorar este correo.{{muted_end}}`,
    sampleVars: { userName: "María González", code: "523847" },
  },
  {
    id: "login_alert",
    label: "Inicio de sesión detectado",
    description: "Alerta de seguridad enviada cuando se inicia sesión en la cuenta.",
    category: "auth",
    variables: ["userName", "email", "method", "dateTime"],
    defaultSubject: "Inicio de sesión detectado — RASMA",
    defaultBody: `{{p_start}}Hola <strong>{{userName}}</strong>, se ha iniciado sesión en su cuenta de RASMA.{{p_end}}
{{details_table}}
{{p_start}}Si fue usted, puede ignorar este correo. Si no reconoce esta actividad, cambie su contraseña inmediatamente.{{p_end}}
{{btn_profileUrl_Ir a Mi Perfil}}
{{muted_start}}Este es un aviso de seguridad automático.{{muted_end}}`,
    sampleVars: {
      userName: "María González",
      email: "maria@email.cl",
      method: "google",
      dateTime: "viernes, 21 de febrero de 2026, 10:30",
    },
  },
  {
    id: "email_change_verify",
    label: "Verificar correo electrónico",
    description: "Se envía al solicitar cambio de correo electrónico.",
    category: "auth",
    variables: ["verifyUrl"],
    defaultSubject: "Verificar nuevo correo electrónico — RASMA",
    defaultBody: `{{p_start}}Se solicitó cambiar su correo electrónico a esta dirección. Haga clic en el botón para confirmar.{{p_end}}
{{btn_verifyUrl_Verificar Correo}}
{{muted_start}}Este enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.{{muted_end}}`,
    sampleVars: { verifyUrl: "https://app.rasma.cl/verificar?token=xyz789" },
  },
  {
    id: "password_changed",
    label: "Contraseña actualizada",
    description: "Confirmación enviada cuando la contraseña se cambia exitosamente.",
    category: "auth",
    variables: ["userName"],
    defaultSubject: "Contraseña actualizada — RASMA",
    defaultBody: `{{p_start}}Hola <strong>{{userName}}</strong>, su contraseña ha sido actualizada exitosamente.{{p_end}}
{{p_start}}Si usted no realizó este cambio, comuníquese inmediatamente con el administrador del sistema.{{p_end}}
{{btn_loginUrl_Iniciar Sesión}}
{{muted_start}}Este es un aviso de seguridad automático.{{muted_end}}`,
    sampleVars: { userName: "María González" },
  },
  {
    id: "welcome_new_user",
    label: "Bienvenido/a (cuenta creada)",
    description: "Se envía cuando un administrador crea una cuenta nueva.",
    category: "auth",
    variables: ["userName", "email", "role", "tempPassword"],
    defaultSubject: "Bienvenido/a a RASMA — Cuenta creada",
    defaultBody: `{{p_start}}Hola <strong>{{userName}}</strong>, se ha creado su cuenta en el sistema de gestión clínica de Fundación RASMA.{{p_end}}
{{details_table}}
{{p_start}}<strong>Importante:</strong> Por seguridad, le recomendamos cambiar su contraseña después de iniciar sesión por primera vez.{{p_end}}
{{btn_loginUrl_Iniciar Sesión}}
{{muted_start}}Si no esperaba recibir este correo, puede ignorarlo.{{muted_end}}`,
    sampleVars: {
      userName: "Carlos Ruiz",
      email: "carlos@rasma.cl",
      role: "Terapeuta",
      tempPassword: "Tmp@8472",
    },
  },
  {
    id: "admin_password_reset",
    label: "Contraseña restablecida por admin",
    description: "Se envía cuando un administrador restablece la contraseña de un usuario.",
    category: "auth",
    variables: ["userName", "tempPassword"],
    defaultSubject: "Contraseña restablecida — RASMA",
    defaultBody: `{{p_start}}Hola <strong>{{userName}}</strong>, un administrador ha restablecido su contraseña.{{p_end}}
{{details_table}}
{{p_start}}<strong>Importante:</strong> Cambie su contraseña inmediatamente después de iniciar sesión.{{p_end}}
{{btn_loginUrl_Iniciar Sesión}}
{{muted_start}}Este es un aviso de seguridad automático.{{muted_end}}`,
    sampleVars: { userName: "Carlos Ruiz", tempPassword: "Tmp@9281" },
  },

  // ============================================================
  // APPOINTMENTS
  // ============================================================
  {
    id: "appointment_confirmation",
    label: "Cita confirmada",
    description: "Se envía cuando se agenda una nueva cita.",
    category: "appointments",
    variables: ["patientName", "therapistName", "dateTime", "duration", "sessionType", "modality", "location", "meetingLink"],
    defaultSubject: "Cita confirmada — RASMA",
    defaultBody: `{{p_start}}Se ha agendado una nueva cita para <strong>{{patientName}}</strong>.{{p_end}}
{{details_table}}
{{btn_citasUrl_Ver Citas}}
{{muted_start}}Si necesita cancelar o reagendar, comuníquese con nosotros.{{muted_end}}`,
    sampleVars: {
      patientName: "María González",
      therapistName: "Dr. Carlos Ruiz",
      dateTime: "martes, 25 de febrero de 2026, 10:00",
      duration: "50",
      sessionType: "Individual",
      modality: "Online",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
  },
  {
    id: "appointment_updated",
    label: "Cita actualizada",
    description: "Se envía cuando se modifican los datos de una cita.",
    category: "appointments",
    variables: ["patientName", "changes", "therapistName", "dateTime", "duration", "sessionType", "modality"],
    defaultSubject: "Cita actualizada — RASMA",
    defaultBody: `{{p_start}}La cita de <strong>{{patientName}}</strong> ha sido modificada.{{p_end}}
{{p_start}}<strong>Cambios:</strong> {{changes}}{{p_end}}
{{details_table}}
{{btn_citasUrl_Ver Citas}}
{{muted_start}}Si tiene preguntas sobre estos cambios, comuníquese con nosotros.{{muted_end}}`,
    sampleVars: {
      patientName: "María González",
      changes: "Fecha cambiada, Modalidad cambiada",
      therapistName: "Dr. Carlos Ruiz",
      dateTime: "miércoles, 26 de febrero de 2026, 14:00",
      duration: "50",
      sessionType: "Individual",
      modality: "Presencial",
    },
  },
  {
    id: "appointment_cancellation",
    label: "Cita cancelada",
    description: "Se envía cuando se cancela una cita.",
    category: "appointments",
    variables: ["patientName", "therapistName", "dateTime", "duration", "sessionType", "modality"],
    defaultSubject: "Cita cancelada — RASMA",
    defaultBody: `{{p_start}}La cita programada para <strong>{{patientName}}</strong> ha sido cancelada.{{p_end}}
{{details_table}}
{{p_start}}Para reagendar, comuníquese con nosotros o ingrese al sistema.{{p_end}}
{{btn_citasUrl_Ver Citas}}`,
    sampleVars: {
      patientName: "María González",
      therapistName: "Dr. Carlos Ruiz",
      dateTime: "martes, 25 de febrero de 2026, 10:00",
      duration: "50",
      sessionType: "Individual",
      modality: "Presencial",
    },
  },
  {
    id: "appointment_reminder",
    label: "Recordatorio de cita",
    description: "Se envía antes de una cita como recordatorio.",
    category: "appointments",
    variables: ["timeText", "patientName", "therapistName", "dateTime", "duration", "sessionType", "modality", "meetingLink"],
    defaultSubject: "Recordatorio de cita en {{timeText}} — RASMA",
    defaultBody: `{{p_start}}Le recordamos que tiene una cita programada en <strong>{{timeText}}</strong>.{{p_end}}
{{details_table}}
{{meet_button}}
{{muted_start}}Si necesita cancelar o reagendar, comuníquese con nosotros lo antes posible.{{muted_end}}`,
    sampleVars: {
      timeText: "24 hora(s)",
      patientName: "María González",
      therapistName: "Dr. Carlos Ruiz",
      dateTime: "martes, 25 de febrero de 2026, 10:00",
      duration: "50",
      sessionType: "Individual",
      modality: "Online",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
  },
  {
    id: "appointment_status",
    label: "Estado de cita actualizado",
    description: "Se envía cuando cambia el estado de una cita.",
    category: "appointments",
    variables: ["patientName", "newStatus", "therapistName", "dateTime", "duration", "sessionType", "modality"],
    defaultSubject: "Estado de cita actualizado — RASMA",
    defaultBody: `{{p_start}}La cita de <strong>{{patientName}}</strong> ha cambiado su estado.{{p_end}}
{{details_table}}
{{btn_citasUrl_Ver Citas}}`,
    sampleVars: {
      patientName: "María González",
      newStatus: "Completada",
      therapistName: "Dr. Carlos Ruiz",
      dateTime: "martes, 25 de febrero de 2026, 10:00",
      duration: "50",
      sessionType: "Individual",
      modality: "Presencial",
    },
  },

  // ============================================================
  // PAYMENTS
  // ============================================================
  {
    id: "payment_confirmation",
    label: "Pago registrado",
    description: "Se envía cuando se registra un pago.",
    category: "payments",
    variables: ["patientName", "amount", "date", "method", "status", "receiptNumber"],
    defaultSubject: "Pago registrado — RASMA",
    defaultBody: `{{p_start}}Se ha registrado un pago para <strong>{{patientName}}</strong>.{{p_end}}
{{details_table}}
{{btn_pagosUrl_Ver Pagos}}`,
    sampleVars: {
      patientName: "María González",
      amount: "$45.000",
      date: "25 de febrero de 2026",
      method: "Transferencia",
      status: "Pagado",
      receiptNumber: "R-2026-0042",
    },
  },
  {
    id: "payment_status",
    label: "Estado de pago actualizado",
    description: "Se envía cuando cambia el estado de un pago.",
    category: "payments",
    variables: ["patientName", "amount", "newStatus", "date", "method"],
    defaultSubject: "Estado de pago actualizado — RASMA",
    defaultBody: `{{p_start}}El pago de <strong>{{patientName}}</strong> ha cambiado a <strong>{{newStatus}}</strong>.{{p_end}}
{{details_table}}
{{btn_pagosUrl_Ver Pagos}}`,
    sampleVars: {
      patientName: "María González",
      amount: "$45.000",
      newStatus: "Pagado",
      date: "25 de febrero de 2026",
      method: "Transferencia",
    },
  },

  // ============================================================
  // TREATMENT
  // ============================================================
  {
    id: "treatment_plan_created",
    label: "Plan de tratamiento creado",
    description: "Se envía cuando se crea un plan de tratamiento.",
    category: "treatment",
    variables: ["patientName", "therapistName", "startDate", "diagnosis", "goals"],
    defaultSubject: "Plan de tratamiento creado — RASMA",
    defaultBody: `{{p_start}}Se ha creado un nuevo plan de tratamiento para <strong>{{patientName}}</strong>.{{p_end}}
{{details_table}}
{{btn_planesUrl_Ver Planes}}
{{muted_start}}Si tiene preguntas sobre su plan de tratamiento, comuníquese con su terapeuta.{{muted_end}}`,
    sampleVars: {
      patientName: "María González",
      therapistName: "Dr. Carlos Ruiz",
      startDate: "25 de febrero de 2026",
      diagnosis: "Trastorno de ansiedad generalizada",
      goals: "Reducir síntomas de ansiedad, mejorar calidad de sueño",
    },
  },
  {
    id: "treatment_plan_status",
    label: "Plan de tratamiento actualizado",
    description: "Se envía cuando cambia el estado de un plan de tratamiento.",
    category: "treatment",
    variables: ["patientName", "newStatus"],
    defaultSubject: "Plan de tratamiento actualizado — RASMA",
    defaultBody: `{{p_start}}El plan de tratamiento de <strong>{{patientName}}</strong> ha cambiado su estado a <strong>{{newStatus}}</strong>.{{p_end}}
{{btn_planesUrl_Ver Planes}}`,
    sampleVars: {
      patientName: "María González",
      newStatus: "Completado",
    },
  },

  // ============================================================
  // SYSTEM
  // ============================================================
  {
    id: "test_email",
    label: "Email de prueba",
    description: "Correo de prueba para verificar la configuración del sistema.",
    category: "system",
    variables: [],
    defaultSubject: "Email de prueba — RASMA",
    defaultBody: `{{p_start}}Este es un correo de prueba del sistema de notificaciones de RASMA.{{p_end}}
{{p_start}}Si está viendo este correo, la configuración de email funciona correctamente.{{p_end}}
{{muted_start}}Enviado el {{timestamp}}{{muted_end}}`,
    sampleVars: {},
  },
];

export function getTemplateById(id: TemplateId): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.id === id);
}
