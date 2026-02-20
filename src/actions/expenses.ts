"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
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

const expenseSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  category: z.enum([
    "arriendo",
    "servicios_basicos",
    "suministros",
    "mantenimiento",
    "seguros",
    "marketing",
    "software",
    "personal",
    "otros",
  ]),
  date: z.string().min(1, "Seleccione una fecha"),
  notes: z.string().optional(),
});

export async function getExpenses(params?: {
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
        expenses.category,
        params.category as (typeof expenses.category.enumValues)[number]
      )
    );
  }

  if (params?.dateFrom) {
    conditions.push(gte(expenses.date, params.dateFrom));
  }

  if (params?.dateTo) {
    conditions.push(lte(expenses.date, params.dateTo));
  }

  if (params?.search) {
    conditions.push(like(expenses.description, `%${params.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(where),
    db.query.expenses.findMany({
      where,
      with: {
        creator: { columns: { id: true, name: true } },
      },
      orderBy: [desc(expenses.date)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    expenses: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

export async function createExpense(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(ADMIN_SUPERVISOR);

  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [expense] = await db
    .insert(expenses)
    .values({
      description: parsed.data.description,
      amount: Math.round(parsed.data.amount * 100),
      category: parsed.data.category,
      date: parsed.data.date,
      notes: parsed.data.notes || null,
      createdBy: session.user.id,
    })
    .returning({ id: expenses.id });

  // Handle optional receipt upload
  const receiptFile = formData.get("receipt") as File | null;
  if (receiptFile && receiptFile.size > 0) {
    if (!ALLOWED_RECEIPT_TYPES.includes(receiptFile.type)) {
      // Expense created but receipt rejected — not a fatal error
      await logAudit({
        userId: session.user.id,
        action: "create",
        entityType: "expense",
        entityId: expense.id,
        details: { amount: parsed.data.amount, receiptError: "Tipo de archivo no permitido" },
      });
      revalidatePath("/gastos");
      return { success: true };
    }

    if (receiptFile.size > MAX_RECEIPT_SIZE) {
      await logAudit({
        userId: session.user.id,
        action: "create",
        entityType: "expense",
        entityId: expense.id,
        details: { amount: parsed.data.amount, receiptError: "Archivo demasiado grande" },
      });
      revalidatePath("/gastos");
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
        .update(expenses)
        .set({
          receiptDriveFileId: result.driveFileId,
          receiptFileName: receiptFile.name,
          receiptMimeType: receiptFile.type,
          receiptViewLink: result.viewLink,
        })
        .where(eq(expenses.id, expense.id));
    } catch (err) {
      console.error("Receipt upload failed:", err);
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "expense",
    entityId: expense.id,
    details: { amount: parsed.data.amount, category: parsed.data.category },
  });

  revalidatePath("/gastos");
  return { success: true };
}

export async function getExpenseById(id: string) {
  await requireRole(ADMIN_SUPERVISOR);
  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, id),
  });
  return expense || null;
}

export async function updateExpense(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(ADMIN_SUPERVISOR);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID de gasto requerido." };

  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.query.expenses.findFirst({
    where: eq(expenses.id, id),
  });
  if (!existing) return { error: "Gasto no encontrado." };

  await db
    .update(expenses)
    .set({
      description: parsed.data.description,
      amount: Math.round(parsed.data.amount * 100),
      category: parsed.data.category,
      date: parsed.data.date,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, id));

  // Handle receipt changes
  const removeReceipt = formData.get("removeReceipt") === "true";
  const receiptFile = formData.get("receipt") as File | null;

  if (removeReceipt && existing.receiptDriveFileId) {
    try {
      await deleteFileFromDriveById(existing.receiptDriveFileId);
    } catch (err) {
      console.error("Failed to delete old receipt:", err);
    }
    await db
      .update(expenses)
      .set({
        receiptDriveFileId: null,
        receiptFileName: null,
        receiptMimeType: null,
        receiptViewLink: null,
      })
      .where(eq(expenses.id, id));
  } else if (receiptFile && receiptFile.size > 0) {
    if (!ALLOWED_RECEIPT_TYPES.includes(receiptFile.type)) {
      // Skip invalid receipt but continue with the update
    } else if (receiptFile.size > MAX_RECEIPT_SIZE) {
      // Skip oversized receipt
    } else {
      // Delete old receipt if exists
      if (existing.receiptDriveFileId) {
        try {
          await deleteFileFromDriveById(existing.receiptDriveFileId);
        } catch (err) {
          console.error("Failed to delete old receipt:", err);
        }
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
          .update(expenses)
          .set({
            receiptDriveFileId: result.driveFileId,
            receiptFileName: receiptFile.name,
            receiptMimeType: receiptFile.type,
            receiptViewLink: result.viewLink,
          })
          .where(eq(expenses.id, id));
      } catch (err) {
        console.error("Receipt upload failed:", err);
      }
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "expense",
    entityId: id,
    details: { amount: parsed.data.amount, category: parsed.data.category },
  });

  revalidatePath("/gastos");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const session = await requireRole(ADMIN_SUPERVISOR);

  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, id),
  });
  if (!expense) return { error: "Gasto no encontrado." };

  // Delete receipt from Drive if exists
  if (expense.receiptDriveFileId) {
    try {
      await deleteFileFromDriveById(expense.receiptDriveFileId);
    } catch (err) {
      console.error("Failed to delete receipt from Drive:", err);
    }
  }

  await db.delete(expenses).where(eq(expenses.id, id));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "expense",
    entityId: id,
    details: { amount: expense.amount / 100, category: expense.category },
  });

  revalidatePath("/gastos");
  return { success: true };
}

export async function bulkDeleteExpenses(ids: string[]) {
  const session = await requireRole(ADMIN_SUPERVISOR);
  if (ids.length === 0) return { error: "No se seleccionaron gastos." };

  const toDelete = await db.query.expenses.findMany({
    where: inArray(expenses.id, ids),
  });

  // Clean up Drive receipts
  for (const expense of toDelete) {
    if (expense.receiptDriveFileId) {
      try {
        await deleteFileFromDriveById(expense.receiptDriveFileId);
      } catch (err) {
        console.error("Failed to delete receipt from Drive:", err);
      }
    }
  }

  await db.delete(expenses).where(inArray(expenses.id, ids));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "expense",
    entityId: ids.join(","),
    details: { count: toDelete.length },
  });

  revalidatePath("/gastos");
  return { success: true, count: toDelete.length };
}

const VALID_CATEGORIES = [
  "arriendo",
  "servicios_basicos",
  "suministros",
  "mantenimiento",
  "seguros",
  "marketing",
  "software",
  "personal",
  "otros",
] as const;

export async function bulkUpdateCategory(
  ids: string[],
  category: string
) {
  const session = await requireRole(ADMIN_SUPERVISOR);
  if (ids.length === 0) return { error: "No se seleccionaron gastos." };

  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Categoría no válida." };
  }

  await db
    .update(expenses)
    .set({
      category: category as (typeof expenses.category.enumValues)[number],
      updatedAt: new Date(),
    })
    .where(inArray(expenses.id, ids));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "expense",
    entityId: ids.join(","),
    details: { count: ids.length, newCategory: category },
  });

  revalidatePath("/gastos");
  return { success: true, count: ids.length };
}

export async function getExpenseStats() {
  await requireRole(ADMIN_SUPERVISOR);

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [monthResult, allResult] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(expenses)
      .where(gte(expenses.date, firstOfMonth)),
    db
      .select({
        total: sql<number>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(expenses),
  ]);

  return {
    totalThisMonth: monthResult[0].total / 100,
    countThisMonth: monthResult[0].count,
    totalAllTime: allResult[0].total / 100,
    countAllTime: allResult[0].count,
  };
}
