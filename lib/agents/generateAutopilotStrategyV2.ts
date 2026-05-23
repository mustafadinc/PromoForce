import type { AppProfile, AutopilotStrategyBrief, BrandMemory, CalendarDuration } from "@/lib/campaignTypes";
import { runCampaignDirectorAgent } from "@/lib/agents/campaignDirectorAgent";
import { runCampaignPostsAgent } from "@/lib/agents/campaignPostsAgent";
import { formatBrandMemoryForPrompt } from "@/lib/brandMemory";
import { formatPerformanceForPrompt } from "@/lib/performanceMemory";

export async function generateAutopilotStrategyV2(
  profile: AppProfile,
  duration: CalendarDuration,
  startDate: string,
  screenshotCount: number,
  brandMemory: BrandMemory | null,
  performanceContext = "",
): Promise<AutopilotStrategyBrief> {
  const brandCtx = formatBrandMemoryForPrompt(brandMemory);
  const perfCtx = performanceContext || formatPerformanceForPrompt(profile.appName);

  const director = await runCampaignDirectorAgent(profile, duration, perfCtx, brandCtx);
  const posts = await runCampaignPostsAgent(
    profile,
    duration,
    startDate,
    director,
    screenshotCount,
    perfCtx,
  );

  return {
    positioning: director.positioning,
    primaryMessage: director.primaryMessage,
    targetAudience: director.targetAudience,
    visualTheme: director.visualTheme,
    brandVoice: director.brandVoice,
    duration,
    startDate,
    contentPillars: director.contentPillars,
    phases: director.phases,
    posts,
  };
}
