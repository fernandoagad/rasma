import { google } from "googleapis";

const FROM_EMAIL = process.env.EMAIL_FROM || "contacto@rasma.cl";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || process.env.AUTH_URL
  || "http://localhost:3000";

// ============================================================
// Gmail API client
// ============================================================

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Logo URL: uses production URL for reliability in emails
const LOGO_SRC = APP_URL.startsWith("http://localhost")
  ? "https://app.rasma.cl/logo-rasma-email.png"
  : `${APP_URL}/logo-rasma-email.png`;

/**
 * Builds a RFC 2822 multipart/alternative email with both plain text and HTML.
 */
function buildRawEmail(to: string, subject: string, html: string, text: string): string {
  const boundary = "boundary_" + Date.now().toString(36);
  const lines = [
    `From: RASMA <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text).toString("base64"),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
    "",
    `--${boundary}--`,
  ];

  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ============================================================
// HTML building blocks (RASMA branding)
// ============================================================

function wrapEmail(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f7f8f8;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8f8">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

<!-- Header -->
<tr><td style="padding:24px 32px;background:#ffffff;border-radius:16px 16px 0 0;border-bottom:1px solid #e5e6e6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="44" style="vertical-align:middle"><img src="${LOGO_SRC}" alt="RASMA" width="40" height="44" style="display:block;border:0;outline:none"></td>
<td style="vertical-align:middle;padding-left:12px"><span style="font-size:18px;font-weight:700;color:#1f2223;letter-spacing:-0.3px">Fundación Rasma</span></td>
</tr>
</table>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px;background:#ffffff">
<h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#1f2223;letter-spacing:-0.3px">${title}</h2>
${body}
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;background:#ffffff;border-radius:0 0 16px 16px;border-top:1px solid #e5e6e6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center">
<p style="margin:0 0 4px 0;font-size:12px;color:#b3bdbd;line-height:1.5">Fundación RASMA — Sistema de Gestión Clínica</p>
<p style="margin:0;font-size:11px;color:#b3bdbd;line-height:1.5">Este es un mensaje automático. Por favor no responda a este correo.</p>
</td></tr>
</table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function btn(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td>
<a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;background:#1f2223;color:#e0ff82;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px">${label}</a>
</td></tr></table>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;color:#415762;line-height:1.65">${text}</p>`;
}

function muted(text: string): string {
  return `<p style="margin:16px 0 0 0;font-size:13px;color:#b3bdbd;line-height:1.6">${text}</p>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f7f8f8;border-radius:12px;border:1px solid #e5e6e6">${rows.map(([l, v], i) =>
    `<tr><td style="padding:10px 16px;font-size:13px;color:#b3bdbd;white-space:nowrap;vertical-align:top;width:140px;${i < rows.length - 1 ? "border-bottom:1px solid #e5e6e6" : ""}">${l}</td><td style="padding:10px 16px;font-size:14px;color:#1f2223;font-weight:500;${i < rows.length - 1 ? "border-bottom:1px solid #e5e6e6" : ""}">${v}</td></tr>`
  ).join("")}</table>`;
}

// ============================================================
// Plain-text building blocks
// ============================================================

function textWrap(title: string, body: string): string {
  return `RASMA — Sistema de Gestión Clínica\n${"=".repeat(40)}\n\n${title}\n${"-".repeat(title.length)}\n\n${body}\n\n--\nFundación RASMA — Sistema de Gestión Clínica`;
}

function textDetails(rows: [string, string][]): string {
  return rows.map(([l, v]) => `  ${l}: ${v.replace(/<[^>]*>/g, "")}`).join("\n");
}

// ============================================================
// Template override system
// ============================================================

import type { TemplateId } from "./email-templates";

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function getTemplateOverrides(id: TemplateId): Promise<{ subject?: string; body?: string } | null> {
  try {
    const { db } = await import("@/lib/db");
    const { systemSettings } = await import("@/lib/db/schema");
    const rows = await db.select().from(systemSettings);
    const subject = rows.find((r) => r.key === `email_tpl_${id}_subject`)?.value;
    const body = rows.find((r) => r.key === `email_tpl_${id}_body`)?.value;
    if (!subject && !body) return null;
    return { subject: subject || undefined, body: body || undefined };
  } catch {
    return null;
  }
}

// Exported for use by the preview system
export { wrapEmail, btn, p, muted, detailsTable, textWrap, textDetails, APP_URL, interpolate };

// ============================================================
// Core send helper
// ============================================================

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  templateId?: TemplateId,
  vars?: Record<string, string>,
): Promise<boolean> {
  try {
    // Apply template overrides from DB if they exist
    if (templateId && vars) {
      const overrides = await getTemplateOverrides(templateId);
      if (overrides?.subject) {
        subject = interpolate(overrides.subject, vars);
      }
      if (overrides?.body) {
        const titleMatch = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
        const title = titleMatch?.[1] || subject.replace(/ — RASMA$/, "");
        html = wrapEmail(title, interpolate(overrides.body, vars));
      }
    }

    const gmail = getGmailClient();
    const raw = buildRawEmail(to, subject, html, text);
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    console.log(`[EMAIL SENT] To: ${to}, Subject: ${subject}`);
    return true;
  } catch (e) {
    console.error("Failed to send email:", e);
    return false;
  }
}

// ============================================================
// Label maps (shared)
// ============================================================

const sessionTypeLabels: Record<string, string> = {
  individual: "Individual", pareja: "Pareja", familiar: "Familiar",
  grupal: "Grupal", evaluacion: "Evaluación",
};
const modalityLabels: Record<string, string> = { presencial: "Presencial", online: "Online" };
const methodLabels: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta", otro: "Otro" };
const paymentStatusLabels: Record<string, string> = { pendiente: "Pendiente", pagado: "Pagado", parcial: "Parcial", cancelado: "Cancelado" };
const appointmentStatusLabels: Record<string, string> = { completada: "Completada", cancelada: "Cancelada", no_asistio: "No asistió", programada: "Programada" };
const roleLabels: Record<string, string> = { admin: "Administrador", terapeuta: "Terapeuta", recepcionista: "Recepcionista", supervisor: "Supervisor", rrhh: "Recursos Humanos" };

// ============================================================
// 1. AUTH EMAILS
// ============================================================

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const title = "Restablecer contraseña";
  const html = wrapEmail(title,
    p("Recibimos una solicitud para restablecer su contraseña. Haga clic en el botón de abajo para crear una nueva contraseña.") +
    btn(resetUrl, "Restablecer Contraseña") +
    muted("Este enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.")
  );
  const text = textWrap(title,
    `Recibimos una solicitud para restablecer su contraseña.\n\nHaga clic en el siguiente enlace para crear una nueva contraseña:\n${resetUrl}\n\nEste enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.`
  );
  return sendEmail(to, "Restablecer contraseña — RASMA", html, text, "password_reset_link", { resetUrl });
}

export async function sendPasswordResetCode(to: string, code: string): Promise<boolean> {
  const title = "Código de recuperación";
  const codeHtml = `<div style="margin:24px 0;text-align:center"><span style="display:inline-block;padding:16px 32px;background:#f7f8f8;border:2px solid #e5e6e6;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2223;font-family:monospace">${code}</span></div>`;
  const html = wrapEmail(title,
    p("Recibimos una solicitud para restablecer su contraseña. Use el siguiente código de verificación:") +
    codeHtml +
    p("Ingrese este código en la página de recuperación de contraseña para continuar.") +
    muted("Este código expira en 15 minutos. Si no solicitó este cambio, puede ignorar este correo.")
  );
  const text = textWrap(title,
    `Recibimos una solicitud para restablecer su contraseña.\n\nSu código de verificación es: ${code}\n\nIngrese este código en la página de recuperación de contraseña.\n\nEste código expira en 15 minutos. Si no solicitó este cambio, puede ignorar este correo.`
  );
  return sendEmail(to, `${code} — Código de recuperación RASMA`, html, text, "password_reset_code", { code });
}

export async function sendRegistrationWelcome(to: string, userName: string, code: string): Promise<boolean> {
  const title = "Bienvenido/a a RASMA";
  const codeHtml = `<div style="margin:24px 0;text-align:center"><span style="display:inline-block;padding:16px 32px;background:#f7f8f8;border:2px solid #e5e6e6;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2223;font-family:monospace">${code}</span></div>`;
  const html = wrapEmail(title,
    p(`Hola <strong>${userName}</strong>, su cuenta en RASMA ha sido creada exitosamente.`) +
    p("Para completar su registro, ingrese el siguiente código de verificación:") +
    codeHtml +
    p("Ingrese este código en la página de registro para verificar su correo electrónico.") +
    muted("Este código expira en 30 minutos. Si no creó esta cuenta, puede ignorar este correo.")
  );
  const text = textWrap(title,
    `Hola ${userName}, su cuenta en RASMA ha sido creada exitosamente.\n\nPara completar su registro, ingrese el siguiente código: ${code}\n\nEste código expira en 30 minutos. Si no creó esta cuenta, puede ignorar este correo.`
  );
  return sendEmail(to, `${code} — Verificar correo RASMA`, html, text, "registration_welcome", { userName, code });
}

export async function sendLoginAlert(to: string, userName: string, method: string): Promise<boolean> {
  const now = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "short" });
  const title = "Inicio de sesión detectado";
  const details: [string, string][] = [
    ["Cuenta", to],
    ["Método", method === "google" ? "Google OAuth" : "Correo y contraseña"],
    ["Fecha y hora", now],
  ];
  const html = wrapEmail(title,
    p(`Hola <strong>${userName}</strong>, se ha iniciado sesión en su cuenta de RASMA.`) +
    detailsTable(details) +
    p("Si fue usted, puede ignorar este correo. Si no reconoce esta actividad, cambie su contraseña inmediatamente.") +
    btn(`${APP_URL}/perfil`, "Ir a Mi Perfil") +
    muted("Este es un aviso de seguridad automático.")
  );
  const text = textWrap(title,
    `Hola ${userName}, se ha iniciado sesión en su cuenta de RASMA.\n\n${textDetails(details)}\n\nSi fue usted, puede ignorar este correo. Si no reconoce esta actividad, cambie su contraseña inmediatamente.\n\nIr a su perfil: ${APP_URL}/perfil`
  );
  return sendEmail(to, "Inicio de sesión detectado — RASMA", html, text, "login_alert", { userName, email: to, method, dateTime: now });
}

export async function sendEmailChangeVerification(to: string, verifyUrl: string): Promise<boolean> {
  const title = "Verificar correo electrónico";
  const html = wrapEmail(title,
    p("Se solicitó cambiar su correo electrónico a esta dirección. Haga clic en el botón para confirmar.") +
    btn(verifyUrl, "Verificar Correo") +
    muted("Este enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.")
  );
  const text = textWrap(title,
    `Se solicitó cambiar su correo electrónico a esta dirección.\n\nPara confirmar, visite:\n${verifyUrl}\n\nEste enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.`
  );
  return sendEmail(to, "Verificar nuevo correo electrónico — RASMA", html, text, "email_change_verify", { verifyUrl });
}

export async function sendPasswordChangedNotification(to: string, userName: string): Promise<boolean> {
  const title = "Contraseña actualizada";
  const html = wrapEmail(title,
    p(`Hola <strong>${userName}</strong>, su contraseña ha sido actualizada exitosamente.`) +
    p("Si usted no realizó este cambio, comuníquese inmediatamente con el administrador del sistema.") +
    btn(`${APP_URL}/login`, "Iniciar Sesión") +
    muted("Este es un aviso de seguridad automático.")
  );
  const text = textWrap(title,
    `Hola ${userName}, su contraseña ha sido actualizada exitosamente.\n\nSi usted no realizó este cambio, comuníquese inmediatamente con el administrador del sistema.\n\nIniciar sesión: ${APP_URL}/login`
  );
  return sendEmail(to, "Contraseña actualizada — RASMA", html, text, "password_changed", { userName });
}

// ============================================================
// 2. USER MANAGEMENT EMAILS
// ============================================================

export async function sendWelcomeEmail(to: string, userName: string, role: string, tempPassword: string): Promise<boolean> {
  const title = "Bienvenido/a a RASMA";
  const roleName = roleLabels[role] || role;
  const details: [string, string][] = [
    ["Nombre", userName],
    ["Correo", to],
    ["Rol", roleName],
    ["Contraseña temporal", `<code style="background:#f7f8f8;padding:2px 8px;border-radius:4px;font-size:16px;letter-spacing:1px">${tempPassword}</code>`],
  ];
  const html = wrapEmail(title,
    p(`Hola <strong>${userName}</strong>, se ha creado su cuenta en el sistema de gestión clínica de Fundación RASMA.`) +
    detailsTable(details) +
    p("<strong>Importante:</strong> Por seguridad, le recomendamos cambiar su contraseña después de iniciar sesión por primera vez.") +
    btn(`${APP_URL}/login`, "Iniciar Sesión") +
    muted("Si no esperaba recibir este correo, puede ignorarlo.")
  );
  const text = textWrap(title,
    `Hola ${userName}, se ha creado su cuenta en RASMA.\n\n${textDetails([["Nombre", userName], ["Correo", to], ["Rol", roleName], ["Contraseña temporal", tempPassword]])}\n\nImportante: Por seguridad, le recomendamos cambiar su contraseña después de iniciar sesión.\n\nIniciar sesión: ${APP_URL}/login`
  );
  return sendEmail(to, "Bienvenido/a a RASMA — Cuenta creada", html, text, "welcome_new_user", { userName, email: to, role: roleName, tempPassword });
}

export async function sendAdminPasswordResetEmail(to: string, userName: string, tempPassword: string): Promise<boolean> {
  const title = "Contraseña restablecida por administrador";
  const html = wrapEmail(title,
    p(`Hola <strong>${userName}</strong>, un administrador ha restablecido su contraseña.`) +
    detailsTable([
      ["Nueva contraseña temporal", `<code style="background:#f7f8f8;padding:2px 8px;border-radius:4px;font-size:16px;letter-spacing:1px">${tempPassword}</code>`],
    ]) +
    p("<strong>Importante:</strong> Cambie su contraseña inmediatamente después de iniciar sesión.") +
    btn(`${APP_URL}/login`, "Iniciar Sesión") +
    muted("Este es un aviso de seguridad automático.")
  );
  const text = textWrap(title,
    `Hola ${userName}, un administrador ha restablecido su contraseña.\n\n  Nueva contraseña temporal: ${tempPassword}\n\nImportante: Cambie su contraseña inmediatamente después de iniciar sesión.\n\nIniciar sesión: ${APP_URL}/login`
  );
  return sendEmail(to, "Contraseña restablecida — RASMA", html, text, "admin_password_reset", { userName, tempPassword });
}

// ============================================================
// 3. APPOINTMENT EMAILS
// ============================================================

export interface AppointmentEmailData {
  patientName: string;
  therapistName: string;
  dateTime: string;
  duration: number;
  sessionType: string;
  modality: string;
  location?: string | null;
  meetingLink?: string | null;
}

function apptDetails(data: AppointmentEmailData, extra?: [string, string][]): [string, string][] {
  const rows: [string, string][] = [
    ["Paciente", data.patientName],
    ["Terapeuta", data.therapistName],
    ["Fecha y hora", data.dateTime],
    ["Duración", `${data.duration} minutos`],
    ["Tipo de sesión", sessionTypeLabels[data.sessionType] || data.sessionType],
    ["Modalidad", modalityLabels[data.modality] || data.modality],
  ];
  if (data.location) rows.push(["Lugar", data.location]);
  if (data.meetingLink) rows.push(["Enlace reunión", `<a href="${data.meetingLink}" style="color:#25c5fa">${data.meetingLink}</a>`]);
  if (extra) rows.push(...extra);
  return rows;
}

function apptDetailsText(data: AppointmentEmailData, extra?: [string, string][]): string {
  const rows: [string, string][] = [
    ["Paciente", data.patientName],
    ["Terapeuta", data.therapistName],
    ["Fecha y hora", data.dateTime],
    ["Duración", `${data.duration} minutos`],
    ["Tipo", sessionTypeLabels[data.sessionType] || data.sessionType],
    ["Modalidad", modalityLabels[data.modality] || data.modality],
  ];
  if (data.location) rows.push(["Lugar", data.location]);
  if (data.meetingLink) rows.push(["Enlace reunión", data.meetingLink]);
  if (extra) rows.push(...extra);
  return textDetails(rows);
}

export async function sendAppointmentConfirmation(to: string, data: AppointmentEmailData): Promise<boolean> {
  const title = "Cita Confirmada";
  const html = wrapEmail(title,
    p(`Se ha agendado una nueva cita para <strong>${data.patientName}</strong>.`) +
    detailsTable(apptDetails(data)) +
    btn(`${APP_URL}/citas`, "Ver Citas") +
    muted("Si necesita cancelar o reagendar, comuníquese con nosotros.")
  );
  const text = textWrap(title,
    `Se ha agendado una nueva cita para ${data.patientName}.\n\n${apptDetailsText(data)}\n\nVer citas: ${APP_URL}/citas\n\nSi necesita cancelar o reagendar, comuníquese con nosotros.`
  );
  return sendEmail(to, "Cita confirmada — RASMA", html, text, "appointment_confirmation", { patientName: data.patientName, therapistName: data.therapistName, dateTime: data.dateTime, duration: String(data.duration), sessionType: data.sessionType, modality: data.modality });
}

export async function sendAppointmentUpdated(to: string, data: AppointmentEmailData, changes: string): Promise<boolean> {
  const title = "Cita Actualizada";
  const html = wrapEmail(title,
    p(`La cita de <strong>${data.patientName}</strong> ha sido modificada.`) +
    p(`<strong>Cambios:</strong> ${changes}`) +
    detailsTable(apptDetails(data)) +
    btn(`${APP_URL}/citas`, "Ver Citas") +
    muted("Si tiene preguntas sobre estos cambios, comuníquese con nosotros.")
  );
  const text = textWrap(title,
    `La cita de ${data.patientName} ha sido modificada.\n\nCambios: ${changes}\n\n${apptDetailsText(data)}\n\nVer citas: ${APP_URL}/citas`
  );
  return sendEmail(to, "Cita actualizada — RASMA", html, text, "appointment_updated", { patientName: data.patientName, changes });
}

export async function sendAppointmentCancellation(to: string, data: AppointmentEmailData): Promise<boolean> {
  const title = "Cita Cancelada";
  const html = wrapEmail(title,
    p(`La cita programada para <strong>${data.patientName}</strong> ha sido cancelada.`) +
    detailsTable(apptDetails(data)) +
    p("Para reagendar, comuníquese con nosotros o ingrese al sistema.") +
    btn(`${APP_URL}/citas`, "Ver Citas")
  );
  const text = textWrap(title,
    `La cita de ${data.patientName} ha sido cancelada.\n\n${apptDetailsText(data)}\n\nPara reagendar, comuníquese con nosotros.\nVer citas: ${APP_URL}/citas`
  );
  return sendEmail(to, "Cita cancelada — RASMA", html, text, "appointment_cancellation", { patientName: data.patientName });
}

export async function sendAppointmentReminder(to: string, data: AppointmentEmailData, hoursUntil: number): Promise<boolean> {
  const timeText = hoursUntil >= 24 ? `${Math.round(hoursUntil / 24)} día(s)` : `${hoursUntil} hora(s)`;
  const title = "Recordatorio de Cita";
  const html = wrapEmail(title,
    p(`Le recordamos que tiene una cita programada en <strong>${timeText}</strong>.`) +
    detailsTable(apptDetails(data)) +
    (data.meetingLink ? btn(data.meetingLink, "Unirse a la Reunión") : "") +
    muted("Si necesita cancelar o reagendar, comuníquese con nosotros lo antes posible.")
  );
  const text = textWrap(title,
    `Le recordamos que tiene una cita programada en ${timeText}.\n\n${apptDetailsText(data)}${data.meetingLink ? `\n\nUnirse a la reunión: ${data.meetingLink}` : ""}\n\nSi necesita cancelar o reagendar, comuníquese con nosotros.`
  );
  return sendEmail(to, `Recordatorio de cita en ${timeText} — RASMA`, html, text, "appointment_reminder", { timeText, patientName: data.patientName });
}

export async function sendAppointmentStatusUpdate(to: string, data: AppointmentEmailData, newStatus: string): Promise<boolean> {
  const statusText = appointmentStatusLabels[newStatus] || newStatus;
  const title = "Estado de Cita Actualizado";
  const html = wrapEmail(title,
    p(`La cita de <strong>${data.patientName}</strong> ha cambiado su estado.`) +
    detailsTable(apptDetails(data, [["Nuevo estado", `<strong>${statusText}</strong>`]])) +
    btn(`${APP_URL}/citas`, "Ver Citas")
  );
  const text = textWrap(title,
    `La cita de ${data.patientName} ha cambiado su estado.\n\n${apptDetailsText(data, [["Nuevo estado", statusText]])}\n\nVer citas: ${APP_URL}/citas`
  );
  return sendEmail(to, "Estado de cita actualizado — RASMA", html, text, "appointment_status", { patientName: data.patientName, newStatus: statusText });
}

// ============================================================
// 4. PAYMENT EMAILS
// ============================================================

export interface PaymentEmailData {
  patientName: string;
  amount: string;
  date: string;
  method?: string | null;
  status: string;
  receiptNumber?: string | null;
}

function payDetails(data: PaymentEmailData): [string, string][] {
  const rows: [string, string][] = [
    ["Paciente", data.patientName],
    ["Monto", data.amount],
    ["Fecha", data.date],
    ["Estado", paymentStatusLabels[data.status] || data.status],
  ];
  if (data.method) rows.push(["Método", methodLabels[data.method] || data.method]);
  if (data.receiptNumber) rows.push(["N° Boleta", data.receiptNumber]);
  return rows;
}

export async function sendPaymentConfirmation(to: string, data: PaymentEmailData): Promise<boolean> {
  const title = "Pago Registrado";
  const html = wrapEmail(title,
    p(`Se ha registrado un pago para <strong>${data.patientName}</strong>.`) +
    detailsTable(payDetails(data)) +
    btn(`${APP_URL}/pagos`, "Ver Pagos")
  );
  const text = textWrap(title,
    `Se ha registrado un pago para ${data.patientName}.\n\n${textDetails(payDetails(data))}\n\nVer pagos: ${APP_URL}/pagos`
  );
  return sendEmail(to, "Pago registrado — RASMA", html, text, "payment_confirmation", { patientName: data.patientName, amount: data.amount });
}

export async function sendPaymentStatusUpdate(to: string, data: PaymentEmailData, newStatus: string): Promise<boolean> {
  const statusText = paymentStatusLabels[newStatus] || newStatus;
  const title = "Estado de Pago Actualizado";
  const html = wrapEmail(title,
    p(`El pago de <strong>${data.patientName}</strong> ha cambiado a <strong>${statusText}</strong>.`) +
    detailsTable(payDetails({ ...data, status: newStatus })) +
    btn(`${APP_URL}/pagos`, "Ver Pagos")
  );
  const text = textWrap(title,
    `El pago de ${data.patientName} ha cambiado a ${statusText}.\n\n${textDetails(payDetails({ ...data, status: newStatus }))}\n\nVer pagos: ${APP_URL}/pagos`
  );
  return sendEmail(to, "Estado de pago actualizado — RASMA", html, text, "payment_status", { patientName: data.patientName, amount: data.amount, newStatus: statusText });
}

// ============================================================
// 5. TREATMENT PLAN EMAILS
// ============================================================

export interface TreatmentPlanEmailData {
  patientName: string;
  therapistName: string;
  diagnosis?: string | null;
  startDate: string;
  goals?: string | null;
}

export async function sendTreatmentPlanCreated(to: string, data: TreatmentPlanEmailData): Promise<boolean> {
  const title = "Plan de Tratamiento Creado";
  const rows: [string, string][] = [
    ["Paciente", data.patientName],
    ["Terapeuta", data.therapistName],
    ["Fecha inicio", data.startDate],
  ];
  if (data.diagnosis) rows.push(["Diagnóstico", data.diagnosis]);
  if (data.goals) rows.push(["Objetivos", data.goals]);

  const html = wrapEmail(title,
    p(`Se ha creado un nuevo plan de tratamiento para <strong>${data.patientName}</strong>.`) +
    detailsTable(rows) +
    btn(`${APP_URL}/planes`, "Ver Planes") +
    muted("Si tiene preguntas sobre su plan de tratamiento, comuníquese con su terapeuta.")
  );
  const text = textWrap(title,
    `Se ha creado un nuevo plan de tratamiento para ${data.patientName}.\n\n${textDetails(rows)}\n\nVer planes: ${APP_URL}/planes\n\nSi tiene preguntas, comuníquese con su terapeuta.`
  );
  return sendEmail(to, "Plan de tratamiento creado — RASMA", html, text, "treatment_plan_created", { patientName: data.patientName, therapistName: data.therapistName, startDate: data.startDate });
}

export async function sendTreatmentPlanStatusUpdate(to: string, patientName: string, newStatus: string): Promise<boolean> {
  const statusLabels: Record<string, string> = { activo: "Activo", completado: "Completado", suspendido: "Suspendido" };
  const statusText = statusLabels[newStatus] || newStatus;
  const title = "Plan de Tratamiento Actualizado";
  const html = wrapEmail(title,
    p(`El plan de tratamiento de <strong>${patientName}</strong> ha cambiado su estado a <strong>${statusText}</strong>.`) +
    btn(`${APP_URL}/planes`, "Ver Planes")
  );
  const text = textWrap(title,
    `El plan de tratamiento de ${patientName} ha cambiado su estado a ${statusText}.\n\nVer planes: ${APP_URL}/planes`
  );
  return sendEmail(to, "Plan de tratamiento actualizado — RASMA", html, text, "treatment_plan_status", { patientName, newStatus: statusText });
}

// ============================================================
// 6. TEST EMAIL
// ============================================================

export async function sendTestEmail(to: string): Promise<boolean> {
  const title = "Prueba Exitosa";
  const html = wrapEmail(title,
    p("Este es un correo de prueba del sistema de notificaciones de RASMA.") +
    p("Si está viendo este correo, la configuración de email funciona correctamente.") +
    muted(`Enviado el ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}`)
  );
  const text = textWrap(title,
    `Este es un correo de prueba del sistema de notificaciones de RASMA.\n\nSi está viendo este correo, la configuración de email funciona correctamente.\n\nEnviado el ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}`
  );
  return sendEmail(to, "Email de prueba — RASMA", html, text, "test_email", {});
}

// ============================================================
// 7. CHAT MESSAGE NOTIFICATION (batched)
// ============================================================

export async function sendChatMessageNotification(
  to: string,
  senderName: string,
  patientName: string,
  messageCount: number,
  patientId: string
): Promise<boolean> {
  const msgWord = messageCount === 1 ? "mensaje" : "mensajes";
  const title = `${senderName} envió ${messageCount} ${msgWord}`;
  const html = wrapEmail(title,
    p(`<strong>${senderName}</strong> envió ${messageCount} ${msgWord} nuevos en la conversación del equipo de atención de <strong>${patientName}</strong>.`) +
    btn(`${APP_URL}/pacientes/${patientId}`, "Ver conversación") +
    muted("Puede gestionar sus notificaciones desde la configuración de su cuenta.")
  );
  const text = textWrap(title,
    `${senderName} envió ${messageCount} ${msgWord} en la conversación del equipo de atención de ${patientName}.\n\nVer conversación: ${APP_URL}/pacientes/${patientId}`
  );
  return sendEmail(to, `${senderName} envió ${messageCount} ${msgWord} — RASMA`, html, text);
}

// ============================================================
// 8. APPLICANT EMAILS
// ============================================================

export async function sendApplicantEmail(
  to: string,
  applicantName: string,
  subject: string,
  body: string,
): Promise<boolean> {
  const title = subject;
  const html = wrapEmail(title,
    p(`Hola <strong>${applicantName}</strong>,`) +
    body.split("\n").map((line) => p(line)).join("") +
    muted("Este correo fue enviado por el equipo de Recursos Humanos de Fundación RASMA.")
  );
  const text = textWrap(title,
    `Hola ${applicantName},\n\n${body}\n\nEste correo fue enviado por el equipo de Recursos Humanos de Fundación RASMA.`
  );
  return sendEmail(to, `${subject} — RASMA`, html, text);
}

// ============================================================
// 9. PREVIEW RENDERER (for admin UI)
// ============================================================

export function renderTemplatePreview(templateId: TemplateId): { subject: string; html: string } | null {
  const { TEMPLATE_REGISTRY } = require("./email-templates");
  const def = TEMPLATE_REGISTRY.find((t: { id: string }) => t.id === templateId);
  if (!def) return null;

  const vars = { ...def.sampleVars, timestamp: new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }) };
  const subject = interpolate(def.defaultSubject, vars);

  // Build sample body using the helpers (matches what the real send functions produce)
  let body = "";
  switch (templateId) {
    case "password_reset_link":
      body = p("Recibimos una solicitud para restablecer su contraseña. Haga clic en el botón de abajo para crear una nueva contraseña.") +
        btn(vars.resetUrl || "#", "Restablecer Contraseña") +
        muted("Este enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.");
      break;
    case "password_reset_code":
    case "registration_welcome": {
      const code = vars.code || "000000";
      const codeHtml = `<div style="margin:24px 0;text-align:center"><span style="display:inline-block;padding:16px 32px;background:#f7f8f8;border:2px solid #e5e6e6;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2223;font-family:monospace">${code}</span></div>`;
      if (templateId === "password_reset_code") {
        body = p("Recibimos una solicitud para restablecer su contraseña. Use el siguiente código de verificación:") +
          codeHtml +
          p("Ingrese este código en la página de recuperación de contraseña para continuar.") +
          muted("Este código expira en 15 minutos. Si no solicitó este cambio, puede ignorar este correo.");
      } else {
        body = p(`Hola <strong>${vars.userName}</strong>, su cuenta en RASMA ha sido creada exitosamente.`) +
          p("Para completar su registro, ingrese el siguiente código de verificación:") +
          codeHtml +
          p("Ingrese este código en la página de registro para verificar su correo electrónico.") +
          muted("Este código expira en 30 minutos. Si no creó esta cuenta, puede ignorar este correo.");
      }
      break;
    }
    case "login_alert":
      body = p(`Hola <strong>${vars.userName}</strong>, se ha iniciado sesión en su cuenta de RASMA.`) +
        detailsTable([["Cuenta", vars.email || ""], ["Método", vars.method === "google" ? "Google OAuth" : "Correo y contraseña"], ["Fecha y hora", vars.dateTime || ""]]) +
        p("Si fue usted, puede ignorar este correo. Si no reconoce esta actividad, cambie su contraseña inmediatamente.") +
        btn(`${APP_URL}/perfil`, "Ir a Mi Perfil") +
        muted("Este es un aviso de seguridad automático.");
      break;
    case "email_change_verify":
      body = p("Se solicitó cambiar su correo electrónico a esta dirección. Haga clic en el botón para confirmar.") +
        btn(vars.verifyUrl || "#", "Verificar Correo") +
        muted("Este enlace expira en 1 hora. Si no solicitó este cambio, puede ignorar este correo.");
      break;
    case "password_changed":
      body = p(`Hola <strong>${vars.userName}</strong>, su contraseña ha sido actualizada exitosamente.`) +
        p("Si usted no realizó este cambio, comuníquese inmediatamente con el administrador del sistema.") +
        btn(`${APP_URL}/login`, "Iniciar Sesión") +
        muted("Este es un aviso de seguridad automático.");
      break;
    case "welcome_new_user":
      body = p(`Hola <strong>${vars.userName}</strong>, se ha creado su cuenta en el sistema de gestión clínica de Fundación RASMA.`) +
        detailsTable([["Nombre", vars.userName || ""], ["Correo", vars.email || ""], ["Rol", vars.role || ""], ["Contraseña temporal", `<code style="background:#f7f8f8;padding:2px 8px;border-radius:4px;font-size:16px;letter-spacing:1px">${vars.tempPassword}</code>`]]) +
        p("<strong>Importante:</strong> Por seguridad, le recomendamos cambiar su contraseña después de iniciar sesión por primera vez.") +
        btn(`${APP_URL}/login`, "Iniciar Sesión") +
        muted("Si no esperaba recibir este correo, puede ignorarlo.");
      break;
    case "admin_password_reset":
      body = p(`Hola <strong>${vars.userName}</strong>, un administrador ha restablecido su contraseña.`) +
        detailsTable([["Nueva contraseña temporal", `<code style="background:#f7f8f8;padding:2px 8px;border-radius:4px;font-size:16px;letter-spacing:1px">${vars.tempPassword}</code>`]]) +
        p("<strong>Importante:</strong> Cambie su contraseña inmediatamente después de iniciar sesión.") +
        btn(`${APP_URL}/login`, "Iniciar Sesión") +
        muted("Este es un aviso de seguridad automático.");
      break;
    case "appointment_confirmation": {
      const rows: [string, string][] = [["Paciente", vars.patientName || ""], ["Terapeuta", vars.therapistName || ""], ["Fecha y hora", vars.dateTime || ""], ["Duración", `${vars.duration || "50"} minutos`], ["Tipo de sesión", vars.sessionType || ""], ["Modalidad", vars.modality || ""]];
      if (vars.meetingLink) rows.push(["Enlace reunión", `<a href="${vars.meetingLink}" style="color:#25c5fa">${vars.meetingLink}</a>`]);
      body = p(`Se ha agendado una nueva cita para <strong>${vars.patientName}</strong>.`) +
        detailsTable(rows) + btn(`${APP_URL}/citas`, "Ver Citas") + muted("Si necesita cancelar o reagendar, comuníquese con nosotros.");
      break;
    }
    case "appointment_updated": {
      const rows2: [string, string][] = [["Paciente", vars.patientName || ""], ["Terapeuta", vars.therapistName || ""], ["Fecha y hora", vars.dateTime || ""], ["Duración", `${vars.duration || "50"} minutos`], ["Tipo de sesión", vars.sessionType || ""], ["Modalidad", vars.modality || ""]];
      body = p(`La cita de <strong>${vars.patientName}</strong> ha sido modificada.`) +
        p(`<strong>Cambios:</strong> ${vars.changes || ""}`) + detailsTable(rows2) + btn(`${APP_URL}/citas`, "Ver Citas") + muted("Si tiene preguntas sobre estos cambios, comuníquese con nosotros.");
      break;
    }
    case "appointment_cancellation": {
      const rows3: [string, string][] = [["Paciente", vars.patientName || ""], ["Terapeuta", vars.therapistName || ""], ["Fecha y hora", vars.dateTime || ""], ["Duración", `${vars.duration || "50"} minutos`], ["Tipo de sesión", vars.sessionType || ""], ["Modalidad", vars.modality || ""]];
      body = p(`La cita programada para <strong>${vars.patientName}</strong> ha sido cancelada.`) +
        detailsTable(rows3) + p("Para reagendar, comuníquese con nosotros o ingrese al sistema.") + btn(`${APP_URL}/citas`, "Ver Citas");
      break;
    }
    case "appointment_reminder": {
      const rows4: [string, string][] = [["Paciente", vars.patientName || ""], ["Terapeuta", vars.therapistName || ""], ["Fecha y hora", vars.dateTime || ""], ["Duración", `${vars.duration || "50"} minutos`], ["Tipo de sesión", vars.sessionType || ""], ["Modalidad", vars.modality || ""]];
      if (vars.meetingLink) rows4.push(["Enlace reunión", `<a href="${vars.meetingLink}" style="color:#25c5fa">${vars.meetingLink}</a>`]);
      body = p(`Le recordamos que tiene una cita programada en <strong>${vars.timeText}</strong>.`) +
        detailsTable(rows4) + (vars.meetingLink ? btn(vars.meetingLink, "Unirse a la Reunión") : "") + muted("Si necesita cancelar o reagendar, comuníquese con nosotros lo antes posible.");
      break;
    }
    case "appointment_status": {
      const rows5: [string, string][] = [["Paciente", vars.patientName || ""], ["Terapeuta", vars.therapistName || ""], ["Fecha y hora", vars.dateTime || ""], ["Duración", `${vars.duration || "50"} minutos`], ["Tipo de sesión", vars.sessionType || ""], ["Modalidad", vars.modality || ""], ["Nuevo estado", `<strong>${vars.newStatus}</strong>`]];
      body = p(`La cita de <strong>${vars.patientName}</strong> ha cambiado su estado.`) +
        detailsTable(rows5) + btn(`${APP_URL}/citas`, "Ver Citas");
      break;
    }
    case "payment_confirmation": {
      const prows: [string, string][] = [["Paciente", vars.patientName || ""], ["Monto", vars.amount || ""], ["Fecha", vars.date || ""], ["Estado", vars.status || ""]];
      if (vars.method) prows.push(["Método", vars.method]);
      if (vars.receiptNumber) prows.push(["N° Boleta", vars.receiptNumber]);
      body = p(`Se ha registrado un pago para <strong>${vars.patientName}</strong>.`) +
        detailsTable(prows) + btn(`${APP_URL}/pagos`, "Ver Pagos");
      break;
    }
    case "payment_status": {
      const prows2: [string, string][] = [["Paciente", vars.patientName || ""], ["Monto", vars.amount || ""], ["Fecha", vars.date || ""], ["Estado", vars.newStatus || ""]];
      if (vars.method) prows2.push(["Método", vars.method]);
      body = p(`El pago de <strong>${vars.patientName}</strong> ha cambiado a <strong>${vars.newStatus}</strong>.`) +
        detailsTable(prows2) + btn(`${APP_URL}/pagos`, "Ver Pagos");
      break;
    }
    case "treatment_plan_created": {
      const trows: [string, string][] = [["Paciente", vars.patientName || ""], ["Terapeuta", vars.therapistName || ""], ["Fecha inicio", vars.startDate || ""]];
      if (vars.diagnosis) trows.push(["Diagnóstico", vars.diagnosis]);
      if (vars.goals) trows.push(["Objetivos", vars.goals]);
      body = p(`Se ha creado un nuevo plan de tratamiento para <strong>${vars.patientName}</strong>.`) +
        detailsTable(trows) + btn(`${APP_URL}/planes`, "Ver Planes") + muted("Si tiene preguntas sobre su plan de tratamiento, comuníquese con su terapeuta.");
      break;
    }
    case "treatment_plan_status":
      body = p(`El plan de tratamiento de <strong>${vars.patientName}</strong> ha cambiado su estado a <strong>${vars.newStatus}</strong>.`) +
        btn(`${APP_URL}/planes`, "Ver Planes");
      break;
    case "test_email":
      body = p("Este es un correo de prueba del sistema de notificaciones de RASMA.") +
        p("Si está viendo este correo, la configuración de email funciona correctamente.") +
        muted(`Enviado el ${vars.timestamp}`);
      break;
    default:
      return null;
  }

  const title = subject.replace(/ — RASMA$/, "").replace(/^\d+ — /, "");
  const html = wrapEmail(title, body);
  return { subject, html };
}
