import type { CalendarPostPlan, ScreenshotUsage } from "@/lib/campaignTypes";

export function normalizeCalendarPostEdit(
  post: CalendarPostPlan,
  patch: Partial<CalendarPostPlan>,
  screenshotCount: number,
): CalendarPostPlan {
  const next = { ...post, ...patch };

  if (patch.hashtags) {
    next.hashtags = patch.hashtags.filter(Boolean);
  }

  if (next.screenshotUsage === "none" || screenshotCount === 0) {
    next.screenshotIndex = null;
    next.screenshotUsage = "none";
  } else if (next.screenshotIndex === null) {
    next.screenshotIndex = 0;
  } else {
    next.screenshotIndex = Math.min(Math.max(next.screenshotIndex, 0), screenshotCount - 1);
  }

  return next;
}

export { screenshotUsageOptions } from "@/lib/normalizeSocialAssetEdit";

export const platformOptions = [
  { value: "instagram_feed", label: "Instagram Feed" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "twitter", label: "X / Twitter" },
] as const;

export const postFormatOptions = [
  { value: "single", label: "Single image" },
  { value: "carousel", label: "Carousel" },
  { value: "story", label: "Story" },
  { value: "reels", label: "Reels / Video" },
] as const;

export const autopilotRoleOptions = [
  { value: "launch", label: "Launch" },
  { value: "feature", label: "Feature" },
  { value: "storytelling", label: "Storytelling" },
  { value: "engagement", label: "Engagement" },
  { value: "cta", label: "CTA" },
  { value: "tip", label: "Tip" },
  { value: "behind_the_scenes", label: "Behind the scenes" },
] as const;

export type { ScreenshotUsage };
