import type { LockedTypography } from "@/lib/campaignTypes";
import {
  APP_STORE_GENERATION_HEIGHT,
  APP_STORE_GENERATION_WIDTH,
} from "@/lib/appStoreImageSizes";
import {
  fitFontSize,
  splitHeadlineParts,
  TEXT_SAFE_WIDTH_RATIO,
  wrapTextToMaxWidth,
} from "@/lib/asoTypography";

const VERB_SIZE_MAX = 148;
const VERB_SIZE_MIN = 88;
const VERB_SIZE_MAX_CTA = 120;
const VERB_SIZE_MIN_CTA = 68;
const DESCRIPTOR_SIZE = 72;
/** Bottom edge of logo row (reference px @ 1280w). */
const BRANDING_ZONE_BOTTOM = 112;
const HEADLINE_GAP_BELOW_BRAND = 36;
const HEADLINE_TOP_BASELINE = 156;
/** Cap height ≈ 82% of font size for uppercase SVG baselines. */
const CAP_HEIGHT_RATIO = 0.82;
/** Subheadline ≈ 52–58% of descriptor size for readable hierarchy. */
const SUB_SIZE_DESCRIPTOR_RATIO = 0.56;
const SUB_SIZE_MIN = 40;
const SUB_SIZE_MAX = 52;
/** Keep headline band in upper ~38% so the mockup has room. */
const MAX_TEXT_BLOCK_HEIGHT_RATIO = 0.38;

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

function computeSubSize(descriptorSize: number, scale: number, isCta: boolean) {
  const fromDescriptor = Math.round(descriptorSize * SUB_SIZE_DESCRIPTOR_RATIO);
  const cap = Math.round((isCta ? SUB_SIZE_MAX : SUB_SIZE_MAX) * scale);
  const floor = Math.round(SUB_SIZE_MIN * scale);
  return Math.min(cap, Math.max(floor, fromDescriptor));
}

function computeFirstLineBaseline(
  scale: number,
  verbSize: number,
  reserveTopForBranding: boolean,
  isCta: boolean,
  height: number,
): number {
  if (isCta) {
    return Math.round(height * 0.14);
  }
  if (reserveTopForBranding) {
    return (
      Math.round(BRANDING_ZONE_BOTTOM * scale) +
      Math.round(HEADLINE_GAP_BELOW_BRAND * scale) +
      Math.round(verbSize * CAP_HEIGHT_RATIO)
    );
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
};

function estimateDescriptorOverflow(descriptor: string, maxWidth: number, fontSize: number): boolean {
  return descriptor.length * fontSize * 0.64 > maxWidth;
}

function estimateSubMax(subheadline: string, maxWidth: number, startSize: number): number {
  let size = startSize;
  const min = Math.round(22 * (maxWidth / (APP_STORE_GENERATION_WIDTH * TEXT_SAFE_WIDTH_RATIO)));
  while (size >= min) {
    const lines = wrapTextToMaxWidth(subheadline, maxWidth, size, 2);
    const longest = Math.max(...lines.map((l) => l.length * size * 0.64), 0);
    if (longest <= maxWidth) return size;
    size -= 2;
  }
  return min;
}

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
): AsoTextLayout {
  const scale = width / APP_STORE_GENERATION_WIDTH;
  const safeWidth = width * TEXT_SAFE_WIDTH_RATIO;
  const { verb, descriptor } = splitHeadlineParts(headline, headlineVerb, headlineDescriptor);

  let verbSize: number;
  let descriptorSize: number;
  let subSize: number;

  if (lockedTypography) {
    verbSize = lockedTypography.verbSize;
    descriptorSize = lockedTypography.descriptorSize;
    subSize = lockedTypography.subSize;
  } else {
    const verbMax = Math.round((isCta ? VERB_SIZE_MAX_CTA : VERB_SIZE_MAX) * scale);
    const verbMin = Math.round((isCta ? VERB_SIZE_MIN_CTA : VERB_SIZE_MIN) * scale);
    verbSize = Math.round(fitFontSize(verb, safeWidth, verbMax, verbMin));
    descriptorSize = Math.round(DESCRIPTOR_SIZE * scale);
    if (descriptor && estimateDescriptorOverflow(descriptor, safeWidth, descriptorSize)) {
      descriptorSize = fitFontSize(descriptor, safeWidth, descriptorSize, Math.round(52 * scale));
    }
    subSize = computeSubSize(descriptorSize, scale, isCta);
    const subMax = estimateSubMax(subheadline, safeWidth, subSize);
    if (subMax < subSize) subSize = Math.max(Math.round(SUB_SIZE_MIN * scale), subMax);
  }

  const verbLines = verb ? [verb] : [];
  const descriptorLines = descriptor
    ? wrapTextToMaxWidth(descriptor, safeWidth, descriptorSize, isCta ? 3 : 2)
    : [];

  const subLines = subheadline.trim()
    ? wrapTextToMaxWidth(subheadline, safeWidth * 0.95, subSize, 2)
    : [];

  const textTopY = computeFirstLineBaseline(scale, verbSize, reserveTopForBranding, isCta, height);
  const verbGap = Math.round(verbSize * 1.02);
  const descGap = Math.round(descriptorSize * 1.12);
  const subGap = Math.round(subSize * 1.28);

  let y = textTopY + verbSize;
  if (descriptorLines.length) {
    y += Math.round(descriptorSize * 0.2) + descriptorLines.length * descGap;
  } else if (verbLines.length) {
    y += verbGap * 0.2;
  }
  if (subLines.length) {
    y += Math.round(subSize * 0.55) + subLines.length * subGap;
  }

  const maxTextBottom = Math.round(height * MAX_TEXT_BLOCK_HEIGHT_RATIO);
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
    fadeHeight: Math.round(height * (isCta ? 0.46 : 0.28)),
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
): LockedTypography {
  const layout = computeAsoTextLayout(
    headline,
    subheadline,
    headlineVerb,
    headlineDescriptor,
    width,
    height,
    isCta,
  );
  return {
    verbSize: layout.verbSize,
    descriptorSize: layout.descriptorSize,
    subSize: layout.subSize,
  };
}

export { APP_STORE_GENERATION_WIDTH, APP_STORE_GENERATION_HEIGHT };
