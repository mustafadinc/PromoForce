import { NextResponse } from "next/server";
import { generateSocialStrategyBrief } from "@/lib/agents/socialStrategyAgent";
import { buildScreenshotIntelligenceContext } from "@/lib/prepareScreenshotIntelligence";
import { extractScreenshots, parseAppProfile, validateAppProfile, validateScreenshots } from "@/lib/parseCampaignForm";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profile = parseAppProfile(formData);
    const screenshots = extractScreenshots(formData);

    const profileError = validateAppProfile(profile);
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    const screenshotError = validateScreenshots(screenshots);
    if (screenshotError) {
      return NextResponse.json({ error: screenshotError }, { status: 400 });
    }

    const { colorProfile, screenshotIntelligence, images } = await buildScreenshotIntelligenceContext(
      profile,
      screenshots,
    );
    const performanceContext = String(formData.get("performanceContext") || "");
    const strategy = await generateSocialStrategyBrief(
      profile,
      images,
      performanceContext,
      colorProfile,
      screenshotIntelligence,
    );

    return NextResponse.json({ strategy, screenshotIntelligence });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Social strategy generation failed.",
      },
      { status: 500 },
    );
  }
}
