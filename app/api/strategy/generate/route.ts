import { NextResponse } from "next/server";
import { generateStrategyBrief, prepareStrategyImages } from "@/lib/agents/strategyAgent";
import { extractScreenshotColorProfile } from "@/lib/extractScreenshotColorProfile";
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

    const colorProfile = await extractScreenshotColorProfile(screenshots);
    const images = await prepareStrategyImages(screenshots);
    const strategy = await generateStrategyBrief(profile, images, colorProfile);

    return NextResponse.json({ strategy });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Strategy generation failed.",
      },
      { status: 500 },
    );
  }
}
