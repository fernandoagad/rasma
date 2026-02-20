"use server";

import { requireStaff, requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { therapistBankAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bankAccountSchema = z.object({
  userId: z.string().min(1),
  bankName: z.string().min(1, "Seleccione un banco"),
  accountType: z.enum(["corriente", "vista", "ahorro", "rut"]),
  accountNumber: z.string().min(1, "Ingrese el número de cuenta"),
  holderRut: z.string().min(1, "Ingrese el RUT del titular"),
  holderName: z.string().min(1, "Ingrese el nombre del titular"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
});

export async function getBankAccount(userId: string) {
  const session = await requireStaff();
  // Allow admin to view any, or self
  if (session.user.role !== "admin" && session.user.id !== userId) {
    return null;
  }

  return db.query.therapistBankAccounts.findFirst({
    where: eq(therapistBankAccounts.userId, userId),
  }) || null;
}

export async function upsertBankAccount(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();

  const raw = Object.fromEntries(formData);
  const parsed = bankAccountSchema.safeParse(raw);

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;

  // Only admin or self can update
  if (session.user.role !== "admin" && session.user.id !== data.userId) {
    return { error: "No autorizado." };
  }

  const existing = await db.query.therapistBankAccounts.findFirst({
    where: eq(therapistBankAccounts.userId, data.userId),
  });

  if (existing) {
    await db
      .update(therapistBankAccounts)
      .set({
        bankName: data.bankName,
        accountType: data.accountType,
        accountNumber: data.accountNumber,
        holderRut: data.holderRut,
        holderName: data.holderName,
        email: data.email || null,
        updatedAt: new Date(),
      })
      .where(eq(therapistBankAccounts.userId, data.userId));
  } else {
    await db.insert(therapistBankAccounts).values({
      userId: data.userId,
      bankName: data.bankName,
      accountType: data.accountType,
      accountNumber: data.accountNumber,
      holderRut: data.holderRut,
      holderName: data.holderName,
      email: data.email || null,
    });
  }

  await logAudit({
    userId: session.user.id,
    action: existing ? "update" : "create",
    entityType: "bank_account",
    entityId: data.userId,
    details: { bank: data.bankName },
  });

  revalidatePath("/perfil");
  revalidatePath(`/rrhh/equipo/${data.userId}`);
  return { success: true };
}
