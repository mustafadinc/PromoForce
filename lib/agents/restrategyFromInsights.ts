import type { AutopilotStrategyBrief, CalendarPostPlan } from "@/lib/campaignTypes";

export type CampaignInsights = {
  topHooks?: string[];
  weakFormats?: string[];
  strongFormats?: string[];
  topHashtags?: string[];
};

/** Adjust pending posts using weekly performance insights (non-destructive for published). */
export function applyInsightsToPendingPosts(
  strategy: AutopilotStrategyBrief,
  insights: CampaignInsights,
  publishedDays: Set<number>,
): AutopilotStrategyBrief {
  const posts: CalendarPostPlan[] = strategy.posts.map((post) => {
    if (publishedDays.has(post.day)) return post;

    let next = { ...post };

    if (insights.weakFormats?.includes(post.format)) {
      next = { ...next, format: "single" };
    } else if (insights.strongFormats?.includes("carousel") && post.format === "single") {
      next = { ...next, format: "carousel" };
    }

    if (insights.topHashtags?.length && post.hashtags.length < 5) {
      const merged = [...new Set([...post.hashtags, ...insights.topHashtags])].slice(0, 8);
      next = { ...next, hashtags: merged };
    }

    if (insights.topHooks?.[0] && post.role === "engagement") {
      next = { ...next, hook: insights.topHooks[0] };
    }

    return next;
  });

  return { ...strategy, posts };
}
