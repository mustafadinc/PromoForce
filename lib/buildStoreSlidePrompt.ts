import type { AppProfile, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { formatExportLabel, getAppStoreGenerationSize } from "@/lib/appStoreImageSizes";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

export function buildStoreSlidePrompt(
  profile: AppProfile,
  strategy: StrategyBrief,
  slide: StoreSlidePlan,
) {
  const beatLabel = storeSlideBeatMeta[slide.asoBeat].label;
  const screenshotLine =
    slide.screenshotUsage === "none"
      ? "No phone mockup — typography and brand visuals only."
      : "Premium iPhone mockup with uploaded screenshot.";

  return [
    `App Store slide ${slide.slideNumber}/5 for "${profile.appName}". Portrait ${getAppStoreGenerationSize()}.`,
    `Beat: ${beatLabel}. ${screenshotLine}`,
    `Headline: "${slide.headline}" | Subheadline: "${slide.subheadline}"`,
    `Theme: ${strategy.visualTheme}. Variant: ${slide.visualVariant}.`,
    `Export target: ${formatExportLabel()}. Cohesive set — same palette; unique scene per slide.`,
  ].join(" ");
}
