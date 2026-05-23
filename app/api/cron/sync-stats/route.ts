import { NextResponse } from "next/server";
import { syncPostStats } from "@/lib/insights/syncPostStats";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const synced = await syncPostStats();
  return NextResponse.json({ ok: true, synced });
}
