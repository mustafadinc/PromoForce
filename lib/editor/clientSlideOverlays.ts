import { getBrandingMetrics } from "@/lib/asoTextLayout";
import type { AppProfile, SocialProofInput, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { getCompositeLayoutProfile, layoutScale } from "@/lib/compositeLayoutProfile";
import type { LocaleCode } from "@/lib/locales";

const FEATURE_PILL = {
  height: 72,
  fontSize: 28,
  bottomPad: 56,
  gap: 14,
  radius: 22,
  sideMarginRatio: 0.055,
  maxWords: 2,
  maxChars: 15,
} as const;

function canvasScale(width: number, height: number) {
  const profile = getCompositeLayoutProfile(width, height);
  return layoutScale(width, height, profile);
}

function shortenPillLabel(label: string) {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const words = clean.split(" ");
  const twoWords = words.slice(0, FEATURE_PILL.maxWords).join(" ");
  if (twoWords.length <= FEATURE_PILL.maxChars) return twoWords.toUpperCase();
  const firstWord = words[0] || clean;
  if (firstWord.length <= FEATURE_PILL.maxChars) return firstWord.toUpperCase();
  return clean.slice(0, FEATURE_PILL.maxChars).trimEnd().toUpperCase();
}

function estimatePillTextWidth(text: string, fontSize: number) {
  let width = 0;
  for (const char of text) {
    width += char === " " ? fontSize * 0.36 : fontSize * 0.58;
  }
  return width;
}

function fitPillFontSize(labels: string[], maxTextWidth: number, preferred: number) {
  const min = Math.round(preferred * 0.78);
  let size = preferred;
  while (size >= min) {
    if (labels.every((label) => estimatePillTextWidth(label, size) <= maxTextWidth)) return size;
    size -= 1;
  }
  return min;
}

export type ClientBrandingLayer = {
  appName: string;
  accentColor: string;
  iconX: number;
  iconY: number;
  iconSize: number;
  textX: number;
  textY: number;
  fontSize: number;
};

export type ClientPillItem = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  label: string;
  fontSize: number;
  dotX: number;
  dotY: number;
  dotRadius: number;
  textX: number;
  textY: number;
};

export type ClientPillsLayer = {
  pills: ClientPillItem[];
  accentColor: string;
  originX: number;
  originY: number;
};

export type ClientSocialProofLayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  accentColor: string;
  rating?: number;
  quote?: string;
  downloadCount?: string;
  award?: string;
  fontSize: number;
  pad: number;
};

export type ClientOverlayLayers = {
  branding?: ClientBrandingLayer;
  featurePills?: ClientPillsLayer;
  socialProof?: ClientSocialProofLayer;
};

export function computeClientOverlayLayers(input: {
  width: number;
  height: number;
  slidePlan: StoreSlidePlan;
  strategy: StrategyBrief;
  appProfile?: AppProfile | null;
  locale?: LocaleCode;
}): ClientOverlayLayers {
  const { width, height, slidePlan, strategy, appProfile } = input;
  const profile = getCompositeLayoutProfile(width, height);
  const scale = canvasScale(width, height);
  const accentColor = strategy.accentColor || strategy.brandColor || "#6366f1";
  const isCta = slidePlan.asoBeat === "download_cta";
  const result: ClientOverlayLayers = {};

  if (slidePlan.showAppBranding && appProfile?.appName && !isCta && profile.format === "app_store") {
    const { textBaselineY, iconSize, fontSize } = getBrandingMetrics(scale);
    const gap = Math.round(12 * scale);
    const label = appProfile.appName.toUpperCase();
    let labelWidth = 0;
    for (const char of label) {
      labelWidth += char === " " ? fontSize * 0.35 : fontSize * 0.58;
    }
    const iconX = width / 2 - (labelWidth + gap + iconSize) / 2;
    const textX = iconX + iconSize + gap;
    const iconCy = textBaselineY - Math.round(iconSize * 0.08);
    result.branding = {
      appName: label,
      accentColor,
      iconX,
      iconY: iconCy - iconSize / 2,
      iconSize,
      textX,
      textY: textBaselineY,
      fontSize,
    };
  }

  const usePills =
    profile.showFeaturePills &&
    slidePlan.asoBeat === "hook" &&
    (slidePlan.layoutStyle === "hero_branded" || slidePlan.layoutStyle === "feature_pills") &&
    slidePlan.featureHighlights.length >= 2 &&
    !isCta;

  if (usePills) {
    const pillLabels = slidePlan.featureHighlights
      .slice(0, 3)
      .map(shortenPillLabel)
      .filter(Boolean);
    if (pillLabels.length >= 2) {
      const sideMargin = Math.round(width * FEATURE_PILL.sideMarginRatio);
      const pillGap = Math.round(FEATURE_PILL.gap * scale);
      const rowW = width - sideMargin * 2;
      const pillW = Math.floor((rowW - pillGap * (pillLabels.length - 1)) / pillLabels.length);
      const pillH = Math.round(FEATURE_PILL.height * scale);
      const pillBottom = Math.round(FEATURE_PILL.bottomPad * scale);
      const pillY = height - pillBottom - pillH;
      const radius = Math.round(FEATURE_PILL.radius * scale);
      const dotR = Math.round(5 * scale);
      const dotGap = Math.round(10 * scale);
      const textPad = Math.round(16 * scale);
      const preferredFontSize = Math.round(FEATURE_PILL.fontSize * scale);
      const fontSize = fitPillFontSize(
        pillLabels,
        pillW - textPad * 2 - dotR * 2 - dotGap,
        preferredFontSize,
      );

      let x = sideMargin;
      const pills: ClientPillItem[] = pillLabels.map((label) => {
        const textW = estimatePillTextWidth(label, fontSize);
        const contentW = dotR * 2 + dotGap + textW;
        const contentStart = x + (pillW - contentW) / 2;
        const dotCx = contentStart + dotR;
        const textX = contentStart + dotR * 2 + dotGap;
        const item: ClientPillItem = {
          x,
          y: pillY,
          width: pillW,
          height: pillH,
          radius,
          label,
          fontSize,
          dotX: dotCx,
          dotY: pillY + pillH / 2,
          dotRadius: dotR,
          textX,
          textY: pillY + pillH / 2 + fontSize * 0.35,
        };
        x += pillW + pillGap;
        return item;
      });

      result.featurePills = { pills, accentColor, originX: 0, originY: 0 };
    }
  }

  const socialProof = appProfile?.socialProof;
  if (slidePlan.showSocialProof && socialProof) {
    const layer = buildSocialProofLayer(socialProof, width, height, accentColor, scale);
    if (layer) result.socialProof = layer;
  }

  return result;
}

function buildSocialProofLayer(
  socialProof: SocialProofInput,
  width: number,
  height: number,
  accentColor: string,
  scale: number,
): ClientSocialProofLayer | null {
  const quote = socialProof.reviewQuotes?.[0]?.trim();
  const downloadCount = socialProof.downloadCount?.trim();
  const award = socialProof.awards?.[0]?.trim();
  const rating = socialProof.rating;
  if (!quote && !downloadCount && !award && !rating) return null;

  const cardW = Math.round(width * 0.78);
  const cardH = Math.round(quote ? 168 * scale : 96 * scale);
  const cardX = Math.round((width - cardW) / 2);
  const cardY = height - Math.round(220 * scale) - cardH;
  const radius = Math.round(20 * scale);
  const pad = Math.round(20 * scale);
  const fontSize = Math.round(26 * scale);

  return {
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    radius,
    accentColor,
    rating,
    quote: quote ? (quote.length > 90 ? `${quote.slice(0, 87)}…` : quote) : undefined,
    downloadCount,
    award,
    fontSize,
    pad,
  };
}
