import type { LockedTypography } from "@/lib/campaignTypes";
import type { LocaleCode } from "@/lib/locales";
import {
  APP_STORE_GENERATION_HEIGHT,
  APP_STORE_GENERATION_WIDTH,
} from "@/lib/appStoreImageSizes";
import {
  getCompositeLayoutProfile,
  layoutScale,
  type CompositeLayoutProfile,
} from "@/lib/compositeLayoutProfile";
import {
  fitFontSize,
  fitMultiLineFontSize,
  splitHeadlineParts,
  wrapTextToMaxWidth,
  estimateTextWidth,
} from "@/lib/asoTypography";

/** Bottom edge of logo row (reference px @ 1280w). */
const BRANDING_ZONE_BOTTOM = 112;
const HEADLINE_GAP_BELOW_BRAND = 36;
const HEADLINE_TOP_BASELINE = 212;
const CAP_HEIGHT_RATIO = 0.82;
const SUB_SIZE_DESCRIPTOR_RATIO = 0.56;

export type BrandingMetrics = {
  textBaselineY: number;
  iconSize: number;
  fontSize: number;
  zoneBottom: number;
};

export function getBrandingMetrics(scale: number): BrandingMetrics {
  const iconSize = Math.round(48 * scale);
  const fontSize = Math.round(34 * scale);
  const textBaselineY = Math.round(64 * scale);
  const zoneBottom = Math.round(BRANDING_ZONE_BOTTOM * scale);
  return { textBaselineY, iconSize, fontSize, zoneBottom };
}

function computeSubSize(
  descriptorSize: number,
  scale: number,
  isCta: boolean,
  profile: CompositeLayoutProfile,
) {
  const fromDescriptor = Math.round(descriptorSize * SUB_SIZE_DESCRIPTOR_RATIO);
  const cap = Math.round((isCta ? profile.subSizeMax : profile.subSizeMax) * scale);
  const floor = Math.round(profile.subSizeMin * scale);
  return Math.min(cap, Math.max(floor, fromDescriptor));
}

function computeFirstLineBaseline(
  scale: number,
  verbSize: number,
  reserveTopForBranding: boolean,
  isCta: boolean,
  height: number,
  profile: CompositeLayoutProfile,
): number {
  if (profile.format === "square") {
    return Math.round(height * 0.055) + Math.round(verbSize * CAP_HEIGHT_RATIO);
  }
  if (profile.format === "portrait_social") {
    return Math.round(height * 0.06) + Math.round(verbSize * CAP_HEIGHT_RATIO);
  }
  if (profile.format === "landscape") {
    return Math.round(height * 0.1) + Math.round(verbSize * CAP_HEIGHT_RATIO);
  }
  return Math.round(HEADLINE_TOP_BASELINE * scale) + Math.round(verbSize * CAP_HEIGHT_RATIO);
}

export type AsoTextLayout = {
  verbSize: number;
  descriptorSize: number;
  subSize: number;
  verbLines: string[];
  descriptorLines: string[];
  subLines: string[];
  textTopY: number;
  textBlockBottom: number;
  fadeHeight: number;
  textAnchorX: number;
  textAnchor: "middle" | "start";
};



export function computeAsoTextLayout(
  headline: string,
  subheadline: string,
  headlineVerb: string | undefined,
  headlineDescriptor: string | undefined,
  width: number,
  height: number,
  isCta: boolean,
  lockedTypography?: LockedTypography,
  reserveTopForBranding = false,
  locale?: LocaleCode,
  maxTextBlockHeightRatio?: number,
): AsoTextLayout {
  const profile = getCompositeLayoutProfile(width, height);
  const textMaxRatio = maxTextBlockHeightRatio ?? profile.maxTextBlockHeightRatio;
  const scale = layoutScale(width, height, profile);
  const safeWidth = width * profile.textSafeWidthRatio;
  const textAnchorX =
    profile.textAlign === "left" ? Math.round(width * 0.08) : Math.round(width / 2);
  const textAnchor = profile.textAlign === "left" ? "start" : "middle";
  const { verb, descriptor } = splitHeadlineParts(headline, headlineVerb, headlineDescriptor, locale);

  let verbSize: number;
  let descriptorSize: number;
  let subSize: number;

  if (lockedTypography) {
    verbSize = lockedTypography.verbSize;
    descriptorSize = lockedTypography.descriptorSize;
    subSize = lockedTypography.subSize;
  } else {
    const verbMax = Math.round(
      (isCta ? profile.verbSizeMaxCta : profile.verbSizeMax) * scale,
    );
    const verbMin = Math.round(
      (isCta ? profile.verbSizeMinCta : profile.verbSizeMin) * scale,
    );
    verbSize = Math.round(fitFontSize(verb, safeWidth, verbMax, verbMin, locale));
    descriptorSize = Math.round(profile.descriptorSize * scale);
    if (verb) {
      descriptorSize = Math.min(descriptorSize, Math.round(verbSize * 0.60));
    }
    if (descriptor) {
      descriptorSize = fitMultiLineFontSize(
        descriptor,
        safeWidth,
        3,
        descriptorSize,
        Math.round(profile.descriptorSize * 0.32 * scale),
        locale,
      );
    }
    subSize = computeSubSize(descriptorSize, scale, isCta, profile);
    if (subheadline.trim()) {
      subSize = fitMultiLineFontSize(
        subheadline,
        safeWidth * 0.95,
        2,
        subSize,
        Math.round(profile.subSizeMin * scale),
        locale,
      );
    }
  }

  const verbLines = verb ? [verb] : [];
  const descriptorLines = descriptor
    ? wrapTextToMaxWidth(descriptor, safeWidth, descriptorSize, 3, locale)
    : [];

  const subLines = subheadline.trim()
    ? wrapTextToMaxWidth(subheadline, safeWidth * 0.95, subSize, 2, locale)
    : [];

  const textTopY = computeFirstLineBaseline(
    scale,
    verbSize,
    reserveTopForBranding,
    isCta,
    height,
    profile,
  );
  const verbGap = Math.round(verbSize * 1.02);
  const descGap = Math.round(descriptorSize * 1.12);
  const subGap = Math.round(subSize * 1.28);

  let y = textTopY + verbSize;
  if (descriptorLines.length) {
    y += Math.round(descriptorSize * 0.38) + descriptorLines.length * descGap;
  } else if (verbLines.length) {
    y += verbGap * 0.2;
  }
  if (subLines.length) {
    y += Math.round(subSize * 0.55) + subLines.length * subGap;
  }

  const maxTextBottom = Math.round(height * textMaxRatio);
  const textBlockBottom = Math.min(y, maxTextBottom);

  return {
    verbSize,
    descriptorSize,
    subSize,
    verbLines,
    descriptorLines,
    subLines,
    textTopY,
    textBlockBottom,
    fadeHeight: Math.round(
      height * (isCta ? profile.fadeHeightRatioCta : profile.fadeHeightRatio),
    ),
    textAnchorX,
    textAnchor,
  };
}

export function computeLockedTypographyFromHeadline(
  headline: string,
  subheadline: string,
  headlineVerb: string | undefined,
  headlineDescriptor: string | undefined,
  width: number,
  height: number,
  isCta: boolean,
  locale?: LocaleCode,
): LockedTypography {
  const layout = computeAsoTextLayout(
    headline,
    subheadline,
    headlineVerb,
    headlineDescriptor,
    width,
    height,
    isCta,
    undefined,
    false,
    locale,
  );
  return {
    verbSize: layout.verbSize,
    descriptorSize: layout.descriptorSize,
    subSize: layout.subSize,
  };
}

export { APP_STORE_GENERATION_WIDTH, APP_STORE_GENERATION_HEIGHT };
