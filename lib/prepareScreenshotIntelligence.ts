import { extractScreenshotColorProfile } from "@/lib/extractScreenshotColorProfile";
import { analyzeScreenshotIntelligence } from "@/lib/agents/screenshotIntelligenceAgent";
import type { AppProfile } from "@/lib/campaignTypes";
import type { LocaleCode } from "@/lib/locales";
import { prepareAnalysisImages, prepareStrategyImages } from "@/lib/strategyImageUtils";

export async function buildScreenshotIntelligenceContext(
  profile: AppProfile,
  screenshots: File[],
  locale: LocaleCode = profile.locales?.[0] ?? "en",
) {
  const colorProfile = await extractScreenshotColorProfile(screenshots);
  const analysisImages = await prepareAnalysisImages(screenshots);
  const screenshotIntelligence = await analyzeScreenshotIntelligence(
    profile,
    analysisImages,
    colorProfile,
    locale,
  );
  const images = await prepareStrategyImages(screenshots);
  return { colorProfile, screenshotIntelligence, images };
}
