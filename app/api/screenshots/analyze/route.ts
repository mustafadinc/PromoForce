import { NextResponse } from "next/server";
import { analyzeScreenshotIntelligence } from "@/lib/agents/screenshotIntelligenceAgent";
import { extractScreenshotColorProfile } from "@/lib/extractScreenshotColorProfile";
import { extractScreenshots, parseAppProfile, validateAppProfile, validateScreenshots } from "@/lib/parseCampaignForm";
import { prepareAnalysisImages } from "@/lib/strategyImageUtils";

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
    const analysisImages = await prepareAnalysisImages(screenshots);
    const screenshotIntelligence = await analyzeScreenshotIntelligence(profile, analysisImages, colorProfile);

    return NextResponse.json({ screenshotIntelligence, colorProfile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Screenshot analysis failed." },
      { status: 500 },
    );
  }
}
