import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { getCampaignWithPosts, schedulePost } from "@/lib/db/services/campaignService";
import { apps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const { campaignId } = await context.params;
    const body = await request.json();
    const day = Number(body.day);
    const scheduledAt = new Date(String(body.scheduledAt || ""));

    if (!day || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "day and scheduledAt required" }, { status: 400 });
    }

    const bundle = await getCampaignWithPosts(campaignId);
    if (!bundle) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const db = getDb();
    const [app] = await db.select().from(apps).where(eq(apps.id, bundle.campaign.appId)).limit(1);
    if (!app || app.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const post = bundle.posts.find((p) => p.day === day);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await schedulePost(post.id, scheduledAt);
    return NextResponse.json({ postId: post.id, status: "scheduled" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schedule failed" },
      { status: 500 },
    );
  }
}
