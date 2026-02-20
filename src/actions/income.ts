"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { income } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, inArray, like } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { uploadExpenseReceipt, deleteFileFromDriveById } from "@/lib/google-drive";

const ADMIN_SUPERVISOR = ["admin", "supervisor"] as const;
const PAGE_SIZE = 20;

const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

const incomeSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  category: z.enum([
    "donacion",
    "subvencion",
    "patrocinio",
    "evento_benefico",
    "convenio",
    "otro_ingreso",
  ]),
  donorName: z.string().optional(),
  referenceNumber: z.string().optional(),
  date: z.string().min(1, "Seleccione una fecha"),
  notes: z.string().optional(),
});

export async function getIncome(params?: {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  search?: string;
}) {
  await requireRole(ADMIN_SUPERVISOR);

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [];

  if (params?.category && params.category !== "all") {
    conditions.push(
      eq(
        income.category,
        params.category as (typeof income.category.enumValues)[number]
      )
    );
  }

  if (params?.dateFrom) {
    conditions.push(gte(income.date, params.dateFrom));
  }

  if (params?.dateTo) {
    conditions.push(lte(income.date, params.dateTo));
  }

  if (params?.search) {
    conditions.push(like(income.description, `%${params.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(income)
      .where(where),
    db.query.income.findMany({
      where,
      with: {
        creator: { columns: { id: true, name: true } },
      },
      orderBy: [desc(income.date)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    income: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

export async function createIncome(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(ADMIN_SUPERVISOR);

  const parsed = incomeSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    donorName: formData.get("donorName") || undefined,
    referenceNumber: formData.get("referenceNumber") || undefined,
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [incomeRecord] = await db
    .insert(income)
    .values({
      description: parsed.data.description,
      amount: Math.round(parsed.data.amount * 100),
      category: parsed.data.category,
      donorName: parsed.data.donorName || null,
      referenceNumber: parsed.data.referenceNumber || null,
      date: parsed.data.date,
      notes: parsed.data.notes || null,
      createdBy: session.user.id,
    })
    .returning({ id: income.id });

  // Handle optional receipt upload
  const receiptFile = formData.get("receipt") as File | null;
  if (receiptFile && receiptFile.size > 0) {
    if (!ALLOWED_RECEIPT_TYPES.includes(receiptFile.type)) {
      // Income created but receipt rejected — not a fatal error
      await logAudit({
        userId: session.user.id,
        action: "create",
        entityType: "income",
        entityId: incomeRecord.id,
        details: { amount: parsed.data.amount, receiptError: "Tipo de archivo no permitido" },
      });
      revalidatePath("/ingresos");
      return { success: true };
    }

    if (receiptFile.size > MAX_RECEIPT_SIZE) {
      await logAudit({
        userId: session.user.id,
        action: "create",
        entityType: "income",
        entityId: incomeRecord.id,
        details: { amount: parsed.data.amount, receiptError: "Archivo demasiado grande" },
      });
      revalidatePath("/ingresos");
      return { success: true };
    }

    try {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const result = await uploadExpenseReceipt({
        buffer,
        fileName: receiptFile.name,
        mimeType: receiptFile.type,
        size: receiptFile.size,
      });
      await db
        .update(income)
        .set({
          receiptDriveFileId: result.driveFileId,
          receiptFileName: receiptFile.name,
          receiptMimeType: receiptFile.type,
          receiptViewLink: result.viewLink,
        })
        .where(eq(income.id, incomeRecord.id));
    } catch (err) {
      console.error("Receipt upload failed:", err);
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "income",
    entityId: incomeRecord.id,
    details: { amount: parsed.data.amount, category: parsed.data.category },
  });

  revalidatePath("/ingresos");
  return { success: true };
}

export async function deleteIncome(id: string) {
  const session = await requireRole(ADMIN_SUPERVISOR);

  const incomeRecord = await db.query.income.findFirst({
    where: eq(income.id, id),
  });
  if (!incomeRecord) return { error: "Ingreso no encontrado." };

  // Delete receipt from Drive if exists
  if (incomeRecord.receiptDriveFileId) {
    try {
      await deleteFileFromDriveById(incomeRecord.receiptDriveFileId);
    } catch (err) {
      console.error("Failed to delete receipt from Drive:", err);
    }
  }

  await db.delete(income).where(eq(income.id, id));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "income",
    entityId: id,
    details: { amount: incomeRecord.amount / 100, category: incomeRecord.category },
  });

  revalidatePath("/ingresos");
  return { success: true };
}

export async function bulkDeleteIncome(ids: string[]) {
  const session = await requireRole(ADMIN_SUPERVISOR);
  if (ids.length === 0) return { error: "No se seleccionaron ingresos." };

  const toDelete = await db.query.income.findMany({
    where: inArray(income.id, ids),
  });

  // Clean up Drive receipts
  for (const incomeRecord of toDelete) {
    if (incomeRecord.receiptDriveFileId) {
      try {
        await deleteFileFromDriveById(incomeRecord.receiptDriveFileId);
      } catch (err) {
        console.error("Failed to delete receipt from Drive:", err);
      }
    }
  }

  await db.delete(income).where(inArray(income.id, ids));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "income",
    entityId: ids.join(","),
    details: { count: toDelete.length },
  });

  revalidatePath("/ingresos");
  return { success: true, count: toDelete.length };
}

const VALID_CATEGORIES = [
  "donacion",
  "subvencion",
  "patrocinio",
  "evento_benefico",
  "convenio",
  "otro_ingreso",
] as const;

export async function bulkUpdateIncomeCategory(
  ids: string[],
  category: string
) {
  const session = await requireRole(ADMIN_SUPERVISOR);
  if (ids.length === 0) return { error: "No se seleccionaron ingresos." };

  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Categoría no válida." };
  }

  await db
    .update(income)
    .set({
      category: category as (typeof income.category.enumValues)[number],
      updatedAt: new Date(),
    })
    .where(inArray(income.id, ids));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "income",
    entityId: ids.join(","),
    details: { count: ids.length, newCategory: category },
  });

  revalidatePath("/ingresos");
  return { success: true, count: ids.length };
}

export async function getIncomeStats() {
  await requireRole(ADMIN_SUPERVISOR);

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [monthResult, allResult] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(income)
      .where(gte(income.date, firstOfMonth)),
    db
      .select({
        total: sql<number>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(income),
  ]);

  return {
    totalThisMonth: monthResult[0].total / 100,
    countThisMonth: monthResult[0].count,
    totalAllTime: allResult[0].total / 100,
    countAllTime: allResult[0].count,
  };
}
