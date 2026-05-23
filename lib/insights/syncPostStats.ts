import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { posts, postStats, socialAccounts } from "@/lib/db/schema";

export async function syncPostStats(): Promise<number> {
  const db = getDb();
  const published = await db.select().from(posts).where(eq(posts.status, "published"));
  let synced = 0;

  for (const post of published) {
    if (!post.externalPostId || !post.socialAccountId) continue;

    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.id, post.socialAccountId))
      .limit(1);

    if (!account?.accessToken) continue;

    try {
      const metrics = await fetchMetricsForPost(post, {
        accessToken: account.accessToken,
        platform: account.platform,
        metadata: account.metadata,
      });
      if (metrics) {
        await db.insert(postStats).values({
          postId: post.id,
          metrics,
        });
        synced++;
      }
    } catch {
      // Skip failed stat sync
    }
  }

  return synced;
}

async function fetchMetricsForPost(
  post: { platform: string; externalPostId: string | null },
  account: { accessToken: string; platform: string; metadata: unknown },
) {
  if (!post.externalPostId) return null;

  if (post.platform === "twitter") {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${post.externalPostId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${account.accessToken}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { public_metrics?: Record<string, number> };
    };
    const m = data.data?.public_metrics;
    if (!m) return null;
    return {
      impressions: m.impression_count ?? 0,
      likes: m.like_count ?? 0,
      retweets: m.retweet_count ?? 0,
      replies: m.reply_count ?? 0,
    };
  }

  if (post.platform === "instagram_feed" || post.platform === "instagram_story") {
    const meta = account.metadata as { igUserId?: string } | null;
    const igUserId = meta?.igUserId;
    if (!igUserId) return null;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${post.externalPostId}/insights?metric=impressions,reach,saved&access_token=${account.accessToken}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ name: string; values: Array<{ value: number }> }>;
    };
    const metrics: Record<string, number> = {};
    for (const item of data.data ?? []) {
      metrics[item.name] = item.values[0]?.value ?? 0;
    }
    return metrics;
  }

  return null;
}
