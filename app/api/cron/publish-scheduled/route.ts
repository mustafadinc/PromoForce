import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "inngest/scheduled.timer", data: { cron: "publish" } });

  return NextResponse.json({ ok: true, triggered: "publish-scheduled-posts" });
}
