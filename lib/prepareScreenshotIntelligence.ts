import { extractScreenshotColorProfile } from "@/lib/extractScreenshotColorProfile";
import { analyzeScreenshotIntelligence } from "@/lib/agents/screenshotIntelligenceAgent";
import type { AppProfile } from "@/lib/campaignTypes";
import { prepareAnalysisImages, prepareStrategyImages } from "@/lib/strategyImageUtils";

export async function buildScreenshotIntelligenceContext(profile: AppProfile, screenshots: File[]) {
  const colorProfile = await extractScreenshotColorProfile(screenshots);
  const analysisImages = await prepareAnalysisImages(screenshots);
  const screenshotIntelligence = await analyzeScreenshotIntelligence(profile, analysisImages, colorProfile);
  const images = await prepareStrategyImages(screenshots);
  return { colorProfile, screenshotIntelligence, images };
}
