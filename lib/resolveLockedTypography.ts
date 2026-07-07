import type { LockedTypography, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { getAppStoreGenerationSize, parseImageSize } from "@/lib/appStoreImageSizes";
import { computeLockedTypographyFromHeadline } from "@/lib/asoTextLayout";
import type { LocaleCode } from "@/lib/locales";

function clampTypographyScale(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.55, numeric));
}

function typographyScaleFor(slide: StoreSlidePlan | undefined, key: "verb" | "descriptor" | "sub") {
  return clampTypographyScale(slide?.typographyScales?.[key]);
}

export function hasCustomTypographyScales(slide: StoreSlidePlan) {
  const scales = slide.typographyScales;
  if (!scales) return false;
  return (
    typeof scales.verb === "number" ||
    typeof scales.descriptor === "number" ||
    typeof scales.sub === "number"
  );
}

export function applySlideTypographyScales(
  typography: LockedTypography,
  slide: StoreSlidePlan,
): LockedTypography {
  const scales = slide.typographyScales;
  if (!scales) return typography;

  return {
    verbSize: Math.round(typography.verbSize * clampTypographyScale(scales.verb)),
    descriptorSize: Math.round(typography.descriptorSize * clampTypographyScale(scales.descriptor)),
    subSize: Math.round(typography.subSize * clampTypographyScale(scales.sub)),
  };
}

export function applyRelativeSlideTypographyScales(
  typography: LockedTypography,
  slide: StoreSlidePlan,
  referenceSlide?: StoreSlidePlan,
): LockedTypography {
  if (!slide.typographyScales && !referenceSlide?.typographyScales) return typography;

  const verbScale = typographyScaleFor(slide, "verb") / typographyScaleFor(referenceSlide, "verb");
  const descriptorScale =
    typographyScaleFor(slide, "descriptor") / typographyScaleFor(referenceSlide, "descriptor");
  const subScale = typographyScaleFor(slide, "sub") / typographyScaleFor(referenceSlide, "sub");

  return {
    verbSize: Math.round(typography.verbSize * verbScale),
    descriptorSize: Math.round(typography.descriptorSize * descriptorScale),
    subSize: Math.round(typography.subSize * subScale),
  };
}

export function computeTypographyForSlide(slide: StoreSlidePlan, locale?: LocaleCode): LockedTypography {
  const { width, height } = parseImageSize(getAppStoreGenerationSize());
  return computeLockedTypographyFromHeadline(
    slide.headline,
    slide.subheadline,
    slide.headlineVerb,
    slide.headlineDescriptor,
    width,
    height,
    slide.asoBeat === "download_cta",
    locale,
  );
}

/** Typography sizes locked from the style-anchor slide for slides 2–5. */
export function resolveLockedTypographyForSlide(
  strategy: StrategyBrief,
  slide: StoreSlidePlan,
  locale?: LocaleCode,
): LockedTypography | undefined {
  const anchorSlideNumber = Number(strategy.styleAnchorSlide || 1);
  const anchor = strategy.slides.find((s) => Number(s.slideNumber) === anchorSlideNumber);
  const base =
    anchor && Number(slide.slideNumber) !== anchorSlideNumber
      ? computeTypographyForSlide(anchor, locale || strategy.locale)
      : computeTypographyForSlide(slide, locale || strategy.locale);

  if (hasCustomTypographyScales(slide)) {
    return applySlideTypographyScales(base, slide);
  }

  return Number(slide.slideNumber) === anchorSlideNumber ? undefined : base;
}
