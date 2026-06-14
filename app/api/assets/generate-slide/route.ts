import { NextResponse } from "next/server";

import { buildStoreSlideBackgroundPrompt } from "@/lib/buildStoreSlideBackgroundPrompt";
import { buildStoreSlidePrompt } from "@/lib/buildStoreSlidePrompt";
import { createAssetStreamResponse } from "@/lib/createAssetStreamResponse";
import { getAppStoreGenerationSize } from "@/lib/appStoreImageSizes";
import type { AppProfile, LockedTypography, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { normalizeMockupPose } from "@/lib/mockupPose";
import { normalizeMockupAssetId } from "@/lib/assetMockup";
import { extractSlideScreenshot, parseAppProfile } from "@/lib/parseCampaignForm";

function parseStrategy(formData: FormData): StrategyBrief {
  return JSON.parse(String(formData.get("strategy") || "{}")) as StrategyBrief;
}

function parseSlide(formData: FormData): StoreSlidePlan {
  return JSON.parse(String(formData.get("slide") || "{}")) as StoreSlidePlan;
}

function parseBackgroundSceneCache(formData: FormData): Record<string, string> {
  try {
    const raw = String(formData.get("backgroundSceneCache") || "{}");
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseLockedTypography(formData: FormData): LockedTypography | undefined {
  try {
    const raw = String(formData.get("lockedTypography") || "");
    if (!raw) return undefined;
    return JSON.parse(raw) as LockedTypography;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profile = parseAppProfile(formData) as AppProfile;
    const strategy = parseStrategy(formData);
    const slide = parseSlide(formData);

    if (!slide.slideNumber) {
      return NextResponse.json({ error: "Slide plan is required." }, { status: 400 });
    }

    if (!process.env.AI_PROVIDER) {
      return NextResponse.json(
        {
          error: "No AI provider configured. Set AI_PROVIDER in .env.local.",
          mode: "local-fallback",
          slideNumber: slide.slideNumber,
        },
        { status: 503 },
      );
    }

    const styleReferenceBase64 = String(formData.get("styleReferenceBase64") || "") || undefined;
    const regenerateMode = String(formData.get("regenerateMode") || "full") as
      | "full"
      | "background"
      | "composite";
    const existingBackgroundBase64 =
      String(formData.get("existingBackgroundBase64") || "") || undefined;
    const mockupColor = String(formData.get("mockupColor") || "") || undefined;
    let mockupPoseOverride: ReturnType<typeof normalizeMockupPose> | undefined;
    try {
      const rawPose = String(formData.get("mockupPose") || "");
      if (rawPose) {
        mockupPoseOverride = normalizeMockupPose(JSON.parse(rawPose), slide.slideNumber);
      }
    } catch {
      mockupPoseOverride = undefined;
    }
    const mockupPose = mockupPoseOverride ?? slide.mockupPose;
    const mockupAssetId = normalizeMockupAssetId(
      String(formData.get("mockupAssetId") || "") || slide.mockupAssetId,
    );
    const styleAnchorHint =
      slide.slideNumber !== strategy.styleAnchorSlide
        ? `Cohesive with slide ${strategy.styleAnchorSlide} — same polish and brand intensity.`
        : undefined;

    const prompt = buildStoreSlidePrompt(profile, strategy, slide);
    const backgroundPrompt = buildStoreSlideBackgroundPrompt(profile, strategy, slide, {
      styleAnchorHint,
      mockupPose,
    });
    const screenshot =
      slide.screenshotIndex !== null && slide.screenshotIndex >= 0
        ? extractSlideScreenshot(formData, slide.screenshotIndex)
        : null;
    const backgroundSceneCache = parseBackgroundSceneCache(formData);
    const cachedBackgroundBase64 =
      regenerateMode !== "background" &&
      slide.backgroundSceneId &&
      backgroundSceneCache[slide.backgroundSceneId]
        ? backgroundSceneCache[slide.backgroundSceneId]
        : undefined;

    return createAssetStreamResponse(
      {
        prompt,
        backgroundPrompt,
        headline: slide.headline,
        headlineVerb: slide.headlineVerb,
        headlineDescriptor: slide.headlineDescriptor,
        subheadline: slide.subheadline,
        screenshot,
        size: getAppStoreGenerationSize(),
        backgroundTreatment: slide.backgroundTreatment,
        backgroundSceneId: slide.backgroundSceneId,
        cachedBackgroundBase64,
        appName: profile.appName,
        accentColor: strategy.accentColor,
        brandColor: strategy.brandColor || strategy.accentColor,
        setMode: strategy.setMode,
        headlineAccent: slide.headlineAccent,
        featureHighlights: slide.featureHighlights,
        showAppBranding: slide.showAppBranding,
        layoutStyle: slide.layoutStyle,
        isCtaSlide: slide.asoBeat === "download_cta",
        slidePlan: slide,
        lockedTypography: parseLockedTypography(formData),
        styleReferenceBase64,
        regenerateMode,
        existingBackgroundBase64,
        mockupColor,
        mockupPose,
        mockupAssetId,
        styleAnchorSlide: strategy.styleAnchorSlide,
        locale: strategy.locale,
        socialProof: profile.socialProof,
        showSocialProof: slide.showSocialProof,
        omitSubheadline: slide.asoBeat === "hook",
      },
      {
        mode: "provider",
        prompt,
        slideNumber: slide.slideNumber,
        role: slide.role,
        headline: slide.headline,
        subheadline: slide.subheadline,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Slide generation failed.",
      },
      { status: 500 },
    );
  }
}
