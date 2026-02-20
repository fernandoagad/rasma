import { db } from "@/lib/db";
import { users, emailChangeRequests } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const changeRequest = await db.query.emailChangeRequests.findFirst({
    where: and(
      eq(emailChangeRequests.tokenHash, tokenHash),
      isNull(emailChangeRequests.confirmedAt)
    ),
  });

  if (!changeRequest) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  if (changeRequest.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=token_expired", request.url));
  }

  // Update user email
  await db
    .update(users)
    .set({
      email: changeRequest.newEmail,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, changeRequest.userId));

  // Mark request as confirmed
  await db
    .update(emailChangeRequests)
    .set({ confirmedAt: new Date() })
    .where(eq(emailChangeRequests.id, changeRequest.id));

  await logAudit({
    userId: changeRequest.userId,
    action: "email_change",
    entityType: "user",
    entityId: changeRequest.userId,
    details: { newEmail: changeRequest.newEmail },
  });

  return NextResponse.redirect(new URL("/login?message=email_changed", request.url));
}
