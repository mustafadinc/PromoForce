import { NextResponse } from "next/server";
import { buildSocialAssetBackgroundPrompt } from "@/lib/buildSocialAssetBackgroundPrompt";
import { buildSocialAssetPrompt } from "@/lib/buildSocialAssetPrompt";
import { createAssetStreamResponse } from "@/lib/createAssetStreamResponse";
import type { AppProfile, SocialAssetPlan, SocialStrategyBrief } from "@/lib/campaignTypes";
import { extractScreenshots, parseAppProfile } from "@/lib/parseCampaignForm";

function parseStrategy(formData: FormData): SocialStrategyBrief {
  return JSON.parse(String(formData.get("strategy") || "{}")) as SocialStrategyBrief;
}

function parseAsset(formData: FormData): SocialAssetPlan {
  return JSON.parse(String(formData.get("asset") || "{}")) as SocialAssetPlan;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profile = parseAppProfile(formData) as AppProfile;
    const strategy = parseStrategy(formData);
    const asset = parseAsset(formData);
    const screenshots = extractScreenshots(formData);

    if (!asset.assetNumber) {
      return NextResponse.json({ error: "Asset plan is required." }, { status: 400 });
    }

    if (!process.env.AI_PROVIDER) {
      return NextResponse.json(
        {
          error: "No AI provider configured. Set AI_PROVIDER in .env.local.",
          mode: "local-fallback",
          assetNumber: asset.assetNumber,
        },
        { status: 503 },
      );
    }

    const prompt = buildSocialAssetPrompt(profile, strategy, asset);
    const backgroundPrompt = buildSocialAssetBackgroundPrompt(profile, strategy, asset);
    const screenshot =
      asset.screenshotIndex !== null && asset.screenshotIndex >= 0
        ? screenshots[asset.screenshotIndex] || null
        : null;

    return createAssetStreamResponse(
      {
        prompt,
        backgroundPrompt,
        headline: asset.headline,
        subheadline: asset.subheadline,
        screenshot,
        size: asset.imageSize,
      },
      {
        mode: "provider",
        prompt,
        assetNumber: asset.assetNumber,
        platform: asset.platform,
        role: asset.role,
        headline: asset.headline,
        hook: asset.hook,
        caption: asset.caption,
        hashtags: asset.hashtags,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Social asset generation failed.",
      },
      { status: 500 },
    );
  }
}
