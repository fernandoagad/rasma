"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { TEMPLATE_REGISTRY, type TemplateId } from "@/lib/email-templates";
import { renderTemplatePreview } from "@/lib/email";

// ============================================================
// Get all templates with override status
// ============================================================

export async function getEmailTemplates() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (session.user.role !== "admin") throw new Error("No autorizado.");

  const rows = await db.select().from(systemSettings);
  const overrideMap = new Map(rows.map((r) => [r.key, r.value]));

  return TEMPLATE_REGISTRY.map((tpl) => ({
    id: tpl.id,
    label: tpl.label,
    description: tpl.description,
    category: tpl.category,
    variables: tpl.variables,
    defaultSubject: tpl.defaultSubject,
    hasSubjectOverride: overrideMap.has(`email_tpl_${tpl.id}_subject`),
    hasBodyOverride: overrideMap.has(`email_tpl_${tpl.id}_body`),
    currentSubject: overrideMap.get(`email_tpl_${tpl.id}_subject`) || tpl.defaultSubject,
    currentBody: overrideMap.get(`email_tpl_${tpl.id}_body`) || null,
  }));
}

// ============================================================
// Update template override
// ============================================================

export async function updateEmailTemplate(
  templateId: TemplateId,
  data: { subject?: string; body?: string },
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const tpl = TEMPLATE_REGISTRY.find((t) => t.id === templateId);
  if (!tpl) return { error: "Plantilla no encontrada." };

  const updates: Record<string, string> = {};

  if (data.subject !== undefined) {
    const key = `email_tpl_${templateId}_subject`;
    updates[key] = data.subject;
    const existing = await db.query.systemSettings.findFirst({ where: eq(systemSettings.key, key) });
    if (existing) {
      await db.update(systemSettings).set({ value: data.subject, updatedAt: new Date() }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value: data.subject });
    }
  }

  if (data.body !== undefined) {
    const key = `email_tpl_${templateId}_body`;
    updates[key] = data.body;
    const existing = await db.query.systemSettings.findFirst({ where: eq(systemSettings.key, key) });
    if (existing) {
      await db.update(systemSettings).set({ value: data.body, updatedAt: new Date() }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value: data.body });
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "email_template",
    entityId: templateId,
    details: updates,
  });

  revalidatePath("/configuracion/plantillas");
  return { success: true };
}

// ============================================================
// Reset template to default
// ============================================================

export async function resetEmailTemplate(
  templateId: TemplateId,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const subjectKey = `email_tpl_${templateId}_subject`;
  const bodyKey = `email_tpl_${templateId}_body`;

  await db.delete(systemSettings).where(eq(systemSettings.key, subjectKey));
  await db.delete(systemSettings).where(eq(systemSettings.key, bodyKey));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "email_template",
    entityId: templateId,
    details: { action: "reset_to_default" },
  });

  revalidatePath("/configuracion/plantillas");
  return { success: true };
}

// ============================================================
// Preview a template
// ============================================================

export async function previewEmailTemplate(
  templateId: TemplateId,
): Promise<{ html: string; subject: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const result = renderTemplatePreview(templateId as TemplateId);
  if (!result) return { error: "Plantilla no encontrada." };

  return result;
}
