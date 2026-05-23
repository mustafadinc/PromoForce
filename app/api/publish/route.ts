import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import { posts, socialAccounts, postAssets } from "@/lib/db/schema";
import { publishToInstagram } from "@/lib/publishers/instagram";
import { publishToX } from "@/lib/publishers/x";
import { refreshXTokenIfNeeded } from "@/lib/publishers/tokenRefresh";
import { captureException } from "@/lib/monitoring";
import { updatePostStatus } from "@/lib/db/services/campaignService";
import { getSignedR2Url } from "@/lib/storage/r2";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const body = await request.json();
    const postId = String(body.postId || "");
    const platforms: string[] = body.platforms ?? ["all"];

    if (!postId) {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }

    const db = getDb();
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const assets = await db.select().from(postAssets).where(eq(postAssets.postId, postId));
    const accounts = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.workspaceId, workspace.id));

    const copy = post.copy as { caption?: string; hashtags?: string[]; hook?: string };
    const caption = [copy.hook, copy.caption].filter(Boolean).join("\n\n");
    const hashtags = (copy.hashtags as string[]) ?? [];

    const mediaUrls: string[] = [];
    const mediaBuffers: Buffer[] = [];
    const mimeTypes: string[] = [];

    for (const asset of assets.sort((a, b) => a.sortOrder - b.sortOrder)) {
      const url = await getSignedR2Url(asset.r2Key, 3600);
      mediaUrls.push(url);
      mimeTypes.push(asset.mimeType);
      const res = await fetch(url);
      if (res.ok) mediaBuffers.push(Buffer.from(await res.arrayBuffer()));
    }

    const targetPlatforms =
      platforms[0] === "all"
        ? accounts.map((a) => a.platform)
        : platforms;

    const results: Array<{ platform: string; externalPostId?: string; error?: string }> = [];

    for (const platform of targetPlatforms) {
      const account = accounts.find((a) => a.platform === platform);
      if (!account?.accessToken) {
        results.push({ platform, error: "Account not connected" });
        continue;
      }

      try {
        if (platform === "instagram" || platform === "instagram_feed" || platform === "instagram_story") {
          const meta = account.metadata as { igUserId?: string; pageId?: string } | null;
          const igUserId = meta?.igUserId ?? account.externalAccountId;
          if (!igUserId) throw new Error("Instagram account misconfigured");

          const result = await publishToInstagram(
            { igUserId, pageAccessToken: account.accessToken },
            { caption, hashtags, mediaUrls, mimeTypes },
            (post.format as "single" | "carousel" | "story" | "reels") || "single",
          );
          results.push({ platform, externalPostId: result.externalPostId });
        } else if (platform === "twitter") {
          const accessToken = (await refreshXTokenIfNeeded(account.id)) ?? account.accessToken;
          const result = await publishToX(accessToken, {
            caption,
            hashtags,
            mediaUrls,
            mediaBuffers: mediaBuffers.slice(0, 1),
            mimeTypes,
          });
          results.push({ platform, externalPostId: result.externalPostId });
        }
      } catch (err) {
        results.push({
          platform,
          error: err instanceof Error ? err.message : "Publish failed",
        });
      }
    }

    const success = results.find((r) => r.externalPostId);
    if (success) {
      await updatePostStatus(postId, "published", {
        externalPostId: success.externalPostId,
        publishedAt: new Date(),
      });
    } else {
      await updatePostStatus(postId, "failed", {
        publishError: results.map((r) => `${r.platform}: ${r.error}`).join("; "),
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    captureException(error, { route: "publish" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 },
    );
  }
}
