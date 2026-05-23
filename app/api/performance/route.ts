import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isDatabaseConfigured, getDb } from "@/lib/db";
import { performanceRecords, apps } from "@/lib/db/schema";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { listAppsForWorkspace } from "@/lib/db/services/workspaceService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const appName = String(body.appName || "");
    const platform = String(body.platform || "");
    const hook = String(body.hook || "");
    const rating = String(body.rating || "medium");
    const usedScreenshot = Boolean(body.usedScreenshot);
    const variantId = String(body.variantId || "A");
    const format = body.format ? String(body.format) : undefined;
    const hashtags = Array.isArray(body.hashtags) ? body.hashtags.map(String) : [];

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ saved: false, mode: "local-only" });
    }

    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);

    const workspaceApps = await listAppsForWorkspace(workspace.id);
    const app = workspaceApps.find((a) => (a.profile as { appName?: string }).appName === appName);
    if (!app) {
      return NextResponse.json({ saved: false, reason: "app not in workspace" });
    }

    const db = getDb();
    await db.insert(performanceRecords).values({
      appId: app.id,
      platform,
      hook,
      rating,
      usedScreenshot,
      variantId,
      format: format ?? null,
      hashtags,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save performance" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appName = searchParams.get("appName");

    if (!isDatabaseConfigured() || !appName) {
      return NextResponse.json({ records: [] });
    }

    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const workspaceApps = await listAppsForWorkspace(workspace.id);
    const app = workspaceApps.find((a) => (a.profile as { appName?: string }).appName === appName);
    if (!app) return NextResponse.json({ records: [] });

    const db = getDb();
    const records = await db
      .select()
      .from(performanceRecords)
      .where(eq(performanceRecords.appId, app.id));

    return NextResponse.json({ records });
  } catch {
    return NextResponse.json({ records: [] });
  }
}
