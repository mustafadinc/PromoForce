import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { posts, postStats, performanceRecords } from "@/lib/db/schema";

export type CampaignInsights = {
  topHooks: string[];
  worstHooks: string[];
  topHashtags: string[];
  bestFormats: string[];
  worstFormats: string[];
  bestHours: string[];
  recommendations: string[];
};

export async function computeCampaignInsights(campaignId: string): Promise<CampaignInsights> {
  const db = getDb();
  const campaignPosts = await db.select().from(posts).where(eq(posts.campaignId, campaignId));

  const hookScores: Map<string, number> = new Map();
  const hashtagScores: Map<string, number> = new Map();
  const formatScores: Map<string, number> = new Map();
  const hourScores: Map<string, number> = new Map();

  for (const post of campaignPosts) {
    const stats = await db
      .select()
      .from(postStats)
      .where(eq(postStats.postId, post.id))
      .orderBy(desc(postStats.recordedAt))
      .limit(1);

    const metrics = stats[0]?.metrics as Record<string, number> | undefined;
    const engagement =
      (metrics?.likes ?? 0) +
      (metrics?.saved ?? 0) +
      (metrics?.retweets ?? 0) +
      (metrics?.replies ?? 0) +
      (metrics?.impressions ?? 0) * 0.01;

    const copy = post.copy as { hook?: string; hashtags?: string[] };
    if (copy.hook) {
      hookScores.set(copy.hook, (hookScores.get(copy.hook) ?? 0) + engagement);
    }

    for (const tag of copy.hashtags ?? []) {
      hashtagScores.set(tag, (hashtagScores.get(tag) ?? 0) + engagement);
    }

    formatScores.set(post.format, (formatScores.get(post.format) ?? 0) + engagement);

    const plan = post.plan as { scheduledTime?: string };
    if (plan.scheduledTime) {
      hourScores.set(plan.scheduledTime, (hourScores.get(plan.scheduledTime) ?? 0) + engagement);
    }
  }

  const perfRecords = await db
    .select()
    .from(performanceRecords)
    .limit(50);

  const topHooks = sortTop(hookScores, 5);
  const worstHooks = sortBottom(hookScores, 3);
  const topHashtags = sortTop(hashtagScores, 8);
  const bestFormats = sortTop(formatScores, 3);
  const worstFormats = sortBottom(formatScores, 2);
  const bestHours = sortTop(hourScores, 3);

  const recommendations: string[] = [];
  if (bestFormats[0]) recommendations.push(`Prioritize ${bestFormats[0]} format posts.`);
  if (worstFormats[0]) recommendations.push(`Reduce ${worstFormats[0]} format — lower engagement.`);
  if (topHashtags.length) recommendations.push(`Continue hashtags: ${topHashtags.slice(0, 3).join(", ")}`);
  if (bestHours.length) recommendations.push(`Best posting times: ${bestHours.join(", ")}`);
  if (perfRecords.filter((r) => r.rating === "high").length) {
    recommendations.push("User-rated high performers inform next week's copy tone.");
  }

  return {
    topHooks,
    worstHooks,
    topHashtags,
    bestFormats,
    worstFormats,
    bestHours,
    recommendations,
  };
}

function sortTop(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function sortBottom(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([key]) => key);
}

export function formatInsightsForPrompt(insights: CampaignInsights): string {
  const lines = ["Campaign performance insights:"];
  if (insights.topHooks.length) lines.push(`- Top hooks: ${insights.topHooks.join(" | ")}`);
  if (insights.worstHooks.length) lines.push(`- Avoid hooks like: ${insights.worstHooks.join(" | ")}`);
  if (insights.topHashtags.length) lines.push(`- Best hashtags: ${insights.topHashtags.join(", ")}`);
  if (insights.bestFormats.length) lines.push(`- Best formats: ${insights.bestFormats.join(", ")}`);
  if (insights.recommendations.length) {
    lines.push("- Recommendations:");
    insights.recommendations.forEach((r) => lines.push(`  ${r}`));
  }
  return lines.join("\n");
}
