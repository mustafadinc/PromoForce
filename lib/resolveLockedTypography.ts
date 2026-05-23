import type { LockedTypography, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { getAppStoreGenerationSize, parseImageSize } from "@/lib/appStoreImageSizes";
import { computeLockedTypographyFromHeadline } from "@/lib/asoTextLayout";

/** Typography sizes locked from the style-anchor slide for slides 2–5. */
export function resolveLockedTypographyForSlide(
  strategy: StrategyBrief,
  slide: StoreSlidePlan,
): LockedTypography | undefined {
  const anchorSlideNumber = strategy.styleAnchorSlide || 1;
  if (slide.slideNumber === anchorSlideNumber) {
    return undefined;
  }

  const anchor = strategy.slides.find((s) => s.slideNumber === anchorSlideNumber);
  if (!anchor) return undefined;

  const { width, height } = parseImageSize(getAppStoreGenerationSize());
  return computeLockedTypographyFromHeadline(
    anchor.headline,
    anchor.subheadline,
    anchor.headlineVerb,
    anchor.headlineDescriptor,
    width,
    height,
    anchor.asoBeat === "download_cta",
  );
}
