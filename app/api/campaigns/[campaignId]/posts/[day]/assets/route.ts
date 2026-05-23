import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import {
  getCampaignWithPosts,
  getPostForCampaignDay,
  persistPostAssetFromDataUrl,
} from "@/lib/db/services/campaignService";
import { apps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string; day: string }> },
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const { campaignId, day: dayParam } = await context.params;
    const day = Number(dayParam);
    const body = await request.json();

    const dataUrl = String(body.dataUrl || "");
    const kind = String(body.kind || "image");
    const sortOrder = Number(body.sortOrder ?? 0);
    const mimeType = body.mimeType ? String(body.mimeType) : undefined;

    if (!dataUrl.startsWith("data:")) {
      return NextResponse.json({ error: "dataUrl required" }, { status: 400 });
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

    const post = await getPostForCampaignDay(campaignId, day);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const asset = await persistPostAssetFromDataUrl(workspace.id, post.id, dataUrl, {
      kind,
      sortOrder,
      mimeType,
    });

    return NextResponse.json({ postId: post.id, assetId: asset?.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save asset" },
      { status: 500 },
    );
  }
}
