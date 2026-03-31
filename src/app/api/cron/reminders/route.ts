import { NextRequest, NextResponse } from "next/server";
import { processPendingReminders } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  // Verify cron secret — required in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await processPendingReminders();

  return NextResponse.json({
    ok: true,
    ...stats,
    timestamp: new Date().toISOString(),
  });
}
