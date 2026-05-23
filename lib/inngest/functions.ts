import { inngest } from "@/lib/inngest/client";
import { getPostsDueForPublish, updatePostStatus } from "@/lib/db/services/campaignService";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { eq } from "drizzle-orm";
import { posts, socialAccounts, postAssets } from "@/lib/db/schema";
import { publishToInstagram } from "@/lib/publishers/instagram";
import { publishToX } from "@/lib/publishers/x";
import { getSignedR2Url } from "@/lib/storage/r2";
import { syncPostStats } from "@/lib/insights/syncPostStats";
import { computeCampaignInsights } from "@/lib/insights/computePerformance";
import { apps, campaigns, campaignInsights } from "@/lib/db/schema";

export const publishScheduledPosts = inngest.createFunction(
  {
    id: "publish-scheduled-posts",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async () => {
    if (!isDatabaseConfigured()) return { processed: 0, results: [] };
    const due = await getPostsDueForPublish(new Date());
    const results = [];

    for (const post of due) {
      try {
        const db = getDb();
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, post.campaignId))
          .limit(1);
        if (!campaign) continue;

        const [app] = await db.select().from(apps).where(eq(apps.id, campaign.appId)).limit(1);

        if (!app) continue;

        const accounts = await db
          .select()
          .from(socialAccounts)
          .where(eq(socialAccounts.workspaceId, app.workspaceId));

        const account = accounts.find((a) => a.platform === post.platform);
        if (!account?.accessToken) {
          await updatePostStatus(post.id, "failed", { publishError: "No connected account" });
          continue;
        }

        const assets = await db.select().from(postAssets).where(eq(postAssets.postId, post.id));
        const mediaUrls: string[] = [];
        const mediaBuffers: Buffer[] = [];
        const mimeTypes: string[] = [];

        for (const asset of assets) {
          const url = await getSignedR2Url(asset.r2Key, 3600);
          mediaUrls.push(url);
          mimeTypes.push(asset.mimeType);
          const res = await fetch(url);
          if (res.ok) mediaBuffers.push(Buffer.from(await res.arrayBuffer()));
        }

        const copy = post.copy as { caption?: string; hashtags?: string[]; hook?: string };
        const caption = [copy.hook, copy.caption].filter(Boolean).join("\n\n");
        const hashtags = (copy.hashtags as string[]) ?? [];

        let externalPostId: string | undefined;

        if (
          post.platform === "instagram" ||
          post.platform === "instagram_feed" ||
          post.platform === "instagram_story"
        ) {
          const meta = account.metadata as { igUserId?: string } | null;
          const igUserId = meta?.igUserId ?? account.externalAccountId!;
          const result = await publishToInstagram(
            { igUserId, pageAccessToken: account.accessToken },
            { caption, hashtags, mediaUrls, mimeTypes },
            (post.format as "single" | "carousel" | "story" | "reels") || "single",
          );
          externalPostId = result.externalPostId;
        } else if (post.platform === "twitter") {
          const result = await publishToX(account.accessToken, {
            caption,
            hashtags,
            mediaUrls,
            mediaBuffers: mediaBuffers.slice(0, 1),
            mimeTypes,
          });
          externalPostId = result.externalPostId;
        }

        await updatePostStatus(post.id, "published", {
          externalPostId,
          publishedAt: new Date(),
        });
        results.push({ postId: post.id, status: "published" });
      } catch (err) {
        await updatePostStatus(post.id, "failed", {
          publishError: err instanceof Error ? err.message : "Publish failed",
        });
        results.push({ postId: post.id, status: "failed" });
      }
    }

    return { processed: results.length, results };
  },
);

export const syncStatsDaily = inngest.createFunction(
  {
    id: "sync-post-stats",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async () => {
    if (!isDatabaseConfigured()) return { synced: 0 };
    const synced = await syncPostStats();
    return { synced };
  },
);

export const weeklyReStrategy = inngest.createFunction(
  {
    id: "weekly-restrategy",
    triggers: [{ cron: "0 8 * * 1" }],
  },
  async () => {
    if (!isDatabaseConfigured()) return { campaignsUpdated: 0 };
    const db = getDb();
    const active = await db.select().from(campaigns).where(eq(campaigns.status, "active"));
    const updated = [];

    for (const campaign of active) {
      const insights = await computeCampaignInsights(campaign.id);
      await db.insert(campaignInsights).values({
        campaignId: campaign.id,
        insights,
      });

      const campaignPosts = await db.select().from(posts).where(eq(posts.campaignId, campaign.id));
      const publishedDays = new Set(
        campaignPosts.filter((p) => p.status === "published").map((p) => p.day),
      );
      const pending = campaignPosts.filter((p) => p.status === "pending" || p.status === "scheduled");

      if (pending.length && campaign.strategy) {
        const { applyInsightsToPendingPosts } = await import("@/lib/agents/restrategyFromInsights");
        const nextStrategy = applyInsightsToPendingPosts(
          campaign.strategy as import("@/lib/campaignTypes").AutopilotStrategyBrief,
          insights as import("@/lib/agents/restrategyFromInsights").CampaignInsights & Record<string, unknown>,
          publishedDays,
        );
        await db
          .update(campaigns)
          .set({ strategy: nextStrategy, updatedAt: new Date() })
          .where(eq(campaigns.id, campaign.id));

        for (const post of pending) {
          const plan = nextStrategy.posts.find((p) => p.day === post.day);
          if (!plan) continue;
          await db
            .update(posts)
            .set({
              format: plan.format,
              copy: {
                hook: plan.hook,
                caption: plan.caption,
                hashtags: plan.hashtags,
                copyVariants: plan.copyVariants,
                selectedVariantId: plan.selectedVariantId,
              },
              plan,
            })
            .where(eq(posts.id, post.id));
        }
      }

      updated.push(campaign.id);
    }

    return { campaignsUpdated: updated.length };
  },
);

export const inngestFunctions = [publishScheduledPosts, syncStatsDaily, weeklyReStrategy];
