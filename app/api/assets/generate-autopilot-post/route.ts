import { NextResponse } from "next/server";
import { resolveAccentColorFromStrategy } from "@/lib/applyScreenshotColorHarmony";
import { buildAutopilotPostBackgroundPrompt } from "@/lib/buildAutopilotPostBackgroundPrompt";
import { buildAutopilotPostPrompt } from "@/lib/buildAutopilotPostPrompt";
import { createAssetStreamResponse } from "@/lib/createAssetStreamResponse";
import type { AppProfile, AutopilotStrategyBrief, CalendarPostPlan } from "@/lib/campaignTypes";
import { extractSlideScreenshot, parseAppProfile } from "@/lib/parseCampaignForm";

function parseStrategy(formData: FormData): AutopilotStrategyBrief {
  return JSON.parse(String(formData.get("strategy") || "{}")) as AutopilotStrategyBrief;
}

function parsePost(formData: FormData): CalendarPostPlan {
  return JSON.parse(String(formData.get("post") || "{}")) as CalendarPostPlan;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profile = parseAppProfile(formData) as AppProfile;
    const strategy = parseStrategy(formData);
    const post = parsePost(formData);
    const sessionBrandMemory = String(formData.get("sessionBrandMemory") || "");

    if (!post.day) {
      return NextResponse.json({ error: "Calendar post plan is required." }, { status: 400 });
    }

    if (!process.env.AI_PROVIDER) {
      return NextResponse.json(
        {
          error: "No AI provider configured. Set AI_PROVIDER in .env.local.",
          mode: "local-fallback",
          day: post.day,
        },
        { status: 503 },
      );
    }

    const prompt = buildAutopilotPostPrompt(profile, strategy, post, sessionBrandMemory);
    const backgroundPrompt = buildAutopilotPostBackgroundPrompt(profile, strategy, post, sessionBrandMemory);
    const screenshot =
      post.screenshotIndex !== null && post.screenshotIndex >= 0
        ? extractSlideScreenshot(formData, post.screenshotIndex)
        : null;

    return createAssetStreamResponse(
      {
        prompt,
        backgroundPrompt,
        headline: post.headline,
        subheadline: post.subheadline,
        screenshot,
        size: post.imageSize,
        visualTemplate: post.visualTemplate,
        accentColor: resolveAccentColorFromStrategy(strategy),
        brandColor: strategy.brandColor ?? strategy.colorProfile?.secondaryColor,
        showAppBranding: post.format === "single" && post.visualTemplate === "hero_mockup",
        layoutStyle: post.format === "single" ? "hero_branded" : "lifestyle_focus",
      },
      {
        mode: "provider",
        prompt,
        day: post.day,
        platform: post.platform,
        role: post.role,
        headline: post.headline,
        hook: post.hook,
        caption: post.caption,
        hashtags: post.hashtags,
        screenshotRationale: post.screenshotRationale,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Autopilot post generation failed.",
      },
      { status: 500 },
    );
  }
}

