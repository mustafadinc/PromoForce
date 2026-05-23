import { NextResponse } from "next/server";
import { buildAutopilotPostBackgroundPrompt } from "@/lib/buildAutopilotPostBackgroundPrompt";
import { extractSlideScreenshot, parseAppProfile } from "@/lib/parseCampaignForm";
import type { AppProfile, AutopilotStrategyBrief, CalendarPostPlan } from "@/lib/campaignTypes";
import { generateBackgroundBuffer } from "@/lib/openaiImageService";
import {
  buildDefaultCarouselSlides,
  generateCarouselSlides,
} from "@/lib/carousel/generateCarousel";
import { parseImageSize } from "@/lib/compositeMarketingSlide";

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

    const slides =
      post.carouselSlides && post.carouselSlides.length >= 2
        ? post.carouselSlides
        : buildDefaultCarouselSlides(post.headline, post.subheadline, 4);

    if (!process.env.AI_PROVIDER) {
      return NextResponse.json({ error: "AI provider not configured" }, { status: 503 });
    }

    const backgroundPrompt = buildAutopilotPostBackgroundPrompt(
      profile,
      strategy,
      post,
      sessionBrandMemory,
    );
    const { width, height } = parseImageSize(post.imageSize);
    const background = await generateBackgroundBuffer({
      prompt: backgroundPrompt,
      size: post.imageSize,
    });

    const screenshot =
      post.screenshotIndex !== null && post.screenshotIndex >= 0
        ? extractSlideScreenshot(formData, post.screenshotIndex)
        : null;

    const slideBuffers = await generateCarouselSlides(slides, {
      background,
      screenshot: screenshot ? Buffer.from(await screenshot.arrayBuffer()) : null,
      defaultHeadline: post.headline,
      defaultSubheadline: post.subheadline,
      accentColor: strategy.visualTheme,
      width,
      height,
    });

    const dataUrls = slideBuffers.map((slide) => ({
      slideIndex: slide.slideIndex,
      dataUrl: `data:image/png;base64,${slide.buffer.toString("base64")}`,
    }));

    const cover = dataUrls[0]?.dataUrl ?? "";

    return NextResponse.json({
      mode: "carousel",
      day: post.day,
      slides: dataUrls,
      dataUrl: cover,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Carousel generation failed" },
      { status: 500 },
    );
  }
}
