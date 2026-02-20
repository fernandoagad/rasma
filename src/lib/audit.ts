import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export async function logAudit(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    await db.insert(auditLog).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("Audit log error:", error);
  }
}
