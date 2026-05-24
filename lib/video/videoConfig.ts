import type { VideoTemplateId } from "@/lib/campaignTypes";

export const videoTemplateDurations: Record<VideoTemplateId, number> = {
  logo_reveal: 3,
  mood_teaser: 6,
  screenshot_reel: 10,
  kinetic_headline: 5,
  countdown_teaser: 4,
};

export const DEFAULT_VIDEO_FPS = 24;
