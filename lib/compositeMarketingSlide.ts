import sharp from "sharp";
import type { LockedTypography, SlideLayoutStyle } from "@/lib/campaignTypes";
import { getAsoFontFaceSvgDef, getSvgFontFamily } from "@/lib/asoFontEmbed";
import { computeAsoTextLayout, computeLockedTypographyFromHeadline, getBrandingMetrics } from "@/lib/asoTextLayout";
import {
  ASO_SVG_FONT_FAMILY,
} from "@/lib/asoTypography";
import type { LocaleCode, SocialProofInput } from "@/lib/campaignTypes";
import { analyzeBackgroundSubject } from "@/lib/backgroundSubjectAnalysis";
import { resolveSubjectAwarePose } from "@/lib/resolveSubjectAwarePose";
import { resolveMockupPlacement } from "@/lib/mockupPose";
import { buildSocialProofSvg } from "@/lib/socialProofOverlay";
import {
  parseImageSize,
} from "@/lib/appStoreImageSizes";
import { resizeScreenshotToScreenWidth } from "@/lib/fitScreenshotToMockupScreen";
import {
  DEVICE_FRAME_HEIGHT,
  DEVICE_FRAME_WIDTH,
  computePhoneScreenLayout,
  getDeviceFrameBuffer,
} from "@/lib/generateDeviceFrame";
import { DEFAULT_ACCENT_COLOR } from "@/lib/storeCreativeDirector";
import {
  getCompositeLayoutProfile,
  layoutScale,
  type CompositeLayoutProfile,
} from "@/lib/compositeLayoutProfile";
import {
  buildPerspectivePhoneGeometry,
  scalePerspectiveGeometry,
  usesPerspectiveMockup,
} from "@/lib/mockupPerspectiveGeometry";
import { METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import { nudgePerspectiveStackX } from "@/lib/perspectiveDeviceWarp";
import { renderPerspectiveDeviceLayers } from "@/lib/renderPerspectiveDevice";
import {
  applyMockupPlacementX,
  mockupPoseScaleMultiplier,
  perspectiveFrontWidthCap,
  resolveCompositeMockupPose,
  type MockupPose,
} from "@/lib/mockupPose";
import { computePerspectiveStackPlacement } from "@/lib/perspectiveStackPosition";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import {
  ASSET_DEVICE_ASPECT,
  assetScreenQuad,
  computeAssetDevicePlacement,
  getSceneMockupAsset,
  usesAssetMockup,
  type MockupAssetId,
} from "@/lib/assetMockup";
import { renderAssetDeviceLayer, renderSceneMockupLayer } from "@/lib/renderAssetDevice";

export { parseImageSize };
export type { LockedTypography };

const MIN_TEXT_DEVICE_GAP = 64;
/** Minimum gap above feature pills / canvas bottom so the full device chin stays visible. */
const BOTTOM_SAFE_MARGIN = 64;
/** Extra clearance so the bottom bezel + rounded chin are never clipped by the canvas edge. */
const PHONE_CHIN_CLEARANCE = 28;
const FRAME_ASPECT = DEVICE_FRAME_HEIGHT / DEVICE_FRAME_WIDTH;

/** Bottom feature pills — reference px at 1280×2784. Equal-width row, short labels. */
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
  return layoutScale(width, height, getCompositeLayoutProfile(width, height));
}

function featurePillReserveHeight(width: number, height: number) {
  const scale = canvasScale(width, height);
  return Math.round((FEATURE_PILL.bottomPad + FEATURE_PILL.height + 28) * scale);
}

export { computeLockedTypographyFromHeadline };

type CompositeMarketingSlideInput = {
  background: Buffer;
  screenshot?: Buffer | null;
  headline: string;
  headlineVerb?: string;
  headlineDescriptor?: string;
  subheadline: string;
  width: number;
  height: number;
  isCta?: boolean;
  appName?: string;
  accentColor?: string;
  headlineAccent?: string;
  featureHighlights?: string[];
  showAppBranding?: boolean;
  layoutStyle?: SlideLayoutStyle;
  lockedTypography?: LockedTypography;
  mockupColor?: string;
  mockupPose?: MockupPose;
  mockupAssetId?: MockupAssetId;
  slideNumber?: number;
  locale?: LocaleCode;
  socialProof?: SocialProofInput;
  showSocialProof?: boolean;
  omitSubheadline?: boolean;
  asoBeat?: import("@/lib/campaignTypes").StoreSlideBeat;
};

type PhoneLayout = {
  phoneX: number;
  phoneY: number;
  phoneW: number;
  phoneH: number;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  screenRadius: number;
  frontW: number;
  mockupPose: MockupPose;
  screenQuad?: PerspectiveQuad;
  assetDevice?: boolean;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPhoneLayout(
  stackX: number,
  stackY: number,
  stackW: number,
  stackH: number,
  frontW: number,
  mockupPose: MockupPose,
): PhoneLayout {
  const rect = computePhoneScreenLayout(stackX + (stackW - frontW), stackY, frontW, stackH);
  if (!usesPerspectiveMockup(mockupPose.orientation)) {
    return { ...rect, phoneX: stackX, phoneW: stackW, phoneH: stackH, frontW, mockupPose };
  }

  const geo = buildPerspectivePhoneGeometry(mockupPose.orientation);
  const scale = frontW / METALLIC_FRAME_W;
  const { screen } = scalePerspectiveGeometry(geo, scale, stackX, stackY);

  return {
    ...rect,
    phoneX: stackX,
    phoneY: stackY,
    phoneW: stackW,
    phoneH: stackH,
    frontW,
    mockupPose,
    screenQuad: screen,
  };
}

function getAssetPhoneLayout(
  width: number,
  height: number,
  textBlockBottom: number,
  reserveBottom: number,
  profile: CompositeLayoutProfile,
  mockupPose: MockupPose,
  mockupAssetId?: MockupAssetId | null,
): PhoneLayout {
  const scale = layoutScale(width, height, profile);
  const sizeMult = mockupPoseScaleMultiplier(mockupPose);
  const resolved = resolveLayoutMockupPose(mockupPose);
  const placement =
    resolved.placement === "left"
      ? "left"
      : resolved.placement === "center"
        ? "center"
        : "right";

  let targetDeviceW = Math.round(width * profile.phoneWidthRatio * sizeMult);
  const capW = perspectiveFrontWidthCap(width, mockupPose);
  if (targetDeviceW > capW) targetDeviceW = capW;

  let topReserve: number;
  let bottomMargin: number;
  let edgeInset: number;

  if (profile.format === "landscape") {
    const sideMargin = Math.round(28 * scale);
    edgeInset = sideMargin;
    const bandH = height - sideMargin * 2;
    const centeredTop = Math.max(0, (bandH - targetDeviceW * ASSET_DEVICE_ASPECT) / 2);
    topReserve = Math.round(sideMargin + centeredTop);
    bottomMargin = Math.round(sideMargin + centeredTop);
  } else {
    const chinClearance = Math.round(PHONE_CHIN_CLEARANCE * scale);
    edgeInset = Math.round(width * 0.055);
    topReserve = textBlockBottom + MIN_TEXT_DEVICE_GAP;
    bottomMargin =
      Math.max(Math.round(BOTTOM_SAFE_MARGIN * scale), reserveBottom) + chinClearance;
  }

  const placed = computeAssetDevicePlacement({
    canvasW: width,
    canvasH: height,
    placement,
    targetDeviceW,
    topReserve,
    bottomMargin,
    edgeInset,
    mockupAssetId,
  });

  const screenQuad = assetScreenQuad(
    mockupPose.orientation,
    placed.deviceW,
    placed.deviceH,
    placed.originX,
    placed.originY,
    mockupAssetId,
  ) as unknown as PerspectiveQuad;

  return {
    phoneX: placed.originX,
    phoneY: placed.originY,
    phoneW: placed.deviceW,
    phoneH: placed.deviceH,
    screenX: placed.originX,
    screenY: placed.originY,
    screenW: placed.deviceW,
    screenH: placed.deviceH,
    screenRadius: 0,
    frontW: placed.deviceW,
    mockupPose,
    screenQuad,
    assetDevice: true,
  };
}

function resolveLayoutMockupPose(pose: MockupPose): MockupPose {
  const placement = resolveMockupPlacement(pose);
  return { ...pose, placement };
}

function getPhoneLayout(
  width: number,
  height: number,
  textBlockBottom: number,
  reserveBottom: number,
  profile: CompositeLayoutProfile,
  mockupPose: MockupPose,
  mockupAssetId?: MockupAssetId | null,
): PhoneLayout {
  const layoutPose = resolveLayoutMockupPose(mockupPose);
  if (usesAssetMockup(layoutPose.orientation, mockupAssetId)) {
    return getAssetPhoneLayout(width, height, textBlockBottom, reserveBottom, profile, layoutPose, mockupAssetId);
  }

  const scale = layoutScale(width, height, profile);
  const sizeMult = mockupPoseScaleMultiplier(layoutPose);

  if (profile.format === "landscape") {
    const sideMargin = Math.round(28 * scale);
    const maxPhoneH = height - sideMargin * 2;
    let phoneW = Math.round(width * profile.phoneWidthRatio * sizeMult);
    let phoneH = Math.round(phoneW * FRAME_ASPECT);

    if (phoneH > maxPhoneH) {
      phoneH = maxPhoneH;
      phoneW = Math.round(phoneH / FRAME_ASPECT);
    }

    phoneW = Math.max(Math.round(width * profile.minPhoneWidthRatio * sizeMult), phoneW);
    phoneH = Math.round(phoneW * FRAME_ASPECT);

    const frontW = phoneW;
    const frontH = phoneH;
    const geo = buildPerspectivePhoneGeometry(layoutPose.orientation);
    const sc = frontW / METALLIC_FRAME_W;
    const stackH = Math.ceil((geo.bounds.maxY - geo.bounds.minY) * sc);
    const stackW = Math.ceil((geo.bounds.maxX - geo.bounds.minX) * sc);
    const centerY = Math.round((height - stackH) / 2);
    const placement =
      layoutPose.placement === "left"
        ? "left"
        : layoutPose.placement === "center"
          ? "center"
          : "right";
    let stackX: number;
    let stackY: number;
    if (usesPerspectiveMockup(layoutPose.orientation)) {
      const placed = computePerspectiveStackPlacement(geo, sc, width, placement, {
        bottomY: centerY + stackH,
        edgeInsetPx: sideMargin,
      });
      stackY = placed.stackY;
      stackX = nudgePerspectiveStackX(geo, sc, placed.stackX, stackY, width, sideMargin);
    } else {
      stackX =
        layoutPose.placement === "left"
          ? sideMargin
          : layoutPose.placement === "center"
            ? Math.round((width - frontW) / 2)
            : width - sideMargin - frontW;
      stackY = centerY;
    }
    return buildPhoneLayout(stackX, stackY, stackW, stackH, frontW, layoutPose);
  }

  const chinClearance = Math.round(PHONE_CHIN_CLEARANCE * scale);
  const bottomMargin =
    Math.max(Math.round(BOTTOM_SAFE_MARGIN * scale), reserveBottom) + chinClearance;
  const topBound = textBlockBottom + MIN_TEXT_DEVICE_GAP;
  const bottomBound = height - bottomMargin;
  const availableH = Math.max(0, bottomBound - topBound);

  const preferredPhoneW = Math.round(width * profile.phoneWidthRatio * sizeMult);
  const minPhoneW = Math.round(width * profile.minPhoneWidthRatio * sizeMult);
  const maxPhoneWFromHeight =
    availableH > 0 ? Math.floor(availableH / FRAME_ASPECT) : preferredPhoneW;

  let phoneW = Math.min(preferredPhoneW, maxPhoneWFromHeight);
  if (phoneW < minPhoneW && maxPhoneWFromHeight >= minPhoneW) {
    phoneW = minPhoneW;
  }
  phoneW = Math.max(Math.round(width * profile.minPhoneWidthRatio * 0.92 * sizeMult), phoneW);
  if (maxPhoneWFromHeight > 0) {
    phoneW = Math.min(phoneW, maxPhoneWFromHeight);
  }

  if (usesPerspectiveMockup(layoutPose.orientation)) {
    const capW = perspectiveFrontWidthCap(width, layoutPose);
    if (phoneW > capW) {
      phoneW = capW;
    }
  }

  let phoneH = Math.floor(phoneW * FRAME_ASPECT);
  if (availableH > 0 && phoneH > availableH) {
    phoneH = availableH;
    phoneW = Math.floor(phoneH / FRAME_ASPECT);
  }

  const frontH = phoneH;
  const frontW = phoneW;
  const geo = buildPerspectivePhoneGeometry(layoutPose.orientation);
  const geoScale = frontW / METALLIC_FRAME_W;
  const stackH = usesPerspectiveMockup(layoutPose.orientation)
    ? Math.ceil((geo.bounds.maxY - geo.bounds.minY) * geoScale)
    : frontH;
  const stackW = usesPerspectiveMockup(layoutPose.orientation)
    ? Math.ceil((geo.bounds.maxX - geo.bounds.minX) * geoScale)
    : frontW;
  const frontY = Math.max(topBound, bottomBound - stackH);

  const insetPx = Math.round(width * 0.055);
  let stackX: number;
  let stackY: number;
  if (usesPerspectiveMockup(layoutPose.orientation)) {
    const placed = computePerspectiveStackPlacement(geo, geoScale, width, layoutPose.placement, {
      bottomY: frontY + stackH,
      edgeInsetPx: insetPx,
    });
    stackY = placed.stackY;
    stackX = nudgePerspectiveStackX(geo, geoScale, placed.stackX, stackY, width, insetPx);
  } else {
    stackX =
      layoutPose.placement !== "center"
        ? applyMockupPlacementX(
            Math.round((width - frontW) / 2),
            frontW,
            width,
            resolveMockupPlacement(layoutPose),
          )
        : Math.round((width - frontW) / 2);
    stackY = frontY;
  }

  return buildPhoneLayout(stackX, stackY, stackW, stackH, frontW, layoutPose);
}

async function fitScreenshotToScreen(screenshot: Buffer, layout: PhoneLayout) {
  const rotated = await sharp(screenshot).rotate().png().toBuffer();
  if (layout.screenQuad) {
    return rotated;
  }
  return resizeScreenshotToScreenWidth(rotated, layout.screenW, layout.screenH);
}

function renderGradientLine(
  line: string,
  anchorX: number,
  y: number,
  fontSize: number,
  fontWeight: number,
  textAnchor: "middle" | "start",
): string {
  return `<text filter="url(#textShadow)" text-anchor="${textAnchor}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}" fill="url(#accentGrad)"><tspan x="${anchorX}" y="${y}">${escapeXml(line)}</tspan></text>`;
}

function renderAccentInLine(
  line: string,
  accentPhrase: string,
  anchorX: number,
  y: number,
  fontSize: number,
  fontWeight: number,
  textAnchor: "middle" | "start",
): string {
  const trimmedAccent = accentPhrase.trim();
  if (!trimmedAccent) {
    return `<text filter="url(#textShadow)" text-anchor="${textAnchor}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}" fill="#ffffff"><tspan x="${anchorX}" y="${y}">${escapeXml(line)}</tspan></text>`;
  }

  const idx = line.toLowerCase().indexOf(trimmedAccent.toLowerCase());
  if (idx === -1) {
    return `<text filter="url(#textShadow)" text-anchor="${textAnchor}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}" fill="#ffffff"><tspan x="${anchorX}" y="${y}">${escapeXml(line)}</tspan></text>`;
  }

  const before = line.slice(0, idx);
  const accent = line.slice(idx, idx + trimmedAccent.length);
  const after = line.slice(idx + trimmedAccent.length);

  return `<text filter="url(#textShadow)" text-anchor="${textAnchor}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}">
    <tspan x="${anchorX}" y="${y}" fill="#ffffff">${escapeXml(before)}</tspan><tspan fill="url(#accentGrad)">${escapeXml(accent)}</tspan><tspan fill="#ffffff">${escapeXml(after)}</tspan>
  </text>`;
}

function buildBrandingBarSvg(appName: string, accentColor: string, width: number, scale: number) {
  const { textBaselineY, iconSize, fontSize } = getBrandingMetrics(scale);
  const gap = Math.round(12 * scale);
  const label = appName.toUpperCase();
  const labelWidth = estimateBrandingLabelWidth(label, fontSize);
  const iconX = width / 2 - (labelWidth + gap + iconSize) / 2;
  const textX = iconX + iconSize + gap;
  const iconCy = textBaselineY - Math.round(iconSize * 0.08);

  return `
  <circle cx="${iconX + iconSize / 2}" cy="${iconCy}" r="${iconSize / 2}" fill="none" stroke="${accentColor}" stroke-width="${Math.max(3, Math.round(3.5 * scale))}"/>
  <circle cx="${iconX + iconSize / 2}" cy="${iconCy}" r="${iconSize / 4}" fill="${accentColor}" opacity="0.9"/>
  <text x="${textX}" y="${textBaselineY}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffffff" letter-spacing="3">${escapeXml(label)}</text>`;
}

function estimateBrandingLabelWidth(label: string, fontSize: number) {
  let width = 0;
  for (const char of label) {
    width += char === " " ? fontSize * 0.35 : fontSize * 0.58;
  }
  return width;
}

function estimatePillTextWidth(text: string, fontSize: number) {
  let width = 0;
  for (const char of text) {
    width += char === " " ? fontSize * 0.36 : fontSize * 0.58;
  }
  return width;
}

function shortenPillLabel(label: string) {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean) return "";

  const words = clean.split(" ");
  const twoWords = words.slice(0, FEATURE_PILL.maxWords).join(" ");
  if (twoWords.length <= FEATURE_PILL.maxChars) {
    return twoWords.toUpperCase();
  }

  const firstWord = words[0] || clean;
  if (firstWord.length <= FEATURE_PILL.maxChars) {
    return firstWord.toUpperCase();
  }

  return clean.slice(0, FEATURE_PILL.maxChars).trimEnd().toUpperCase();
}

function fitPillFontSize(labels: string[], maxTextWidth: number, preferred: number) {
  const min = Math.round(preferred * 0.78);
  let size = preferred;
  while (size >= min) {
    if (labels.every((label) => estimatePillTextWidth(label, size) <= maxTextWidth)) {
      return size;
    }
    size -= 1;
  }
  return min;
}

function buildFeaturePillsSvg(labels: string[], accentColor: string, width: number, height: number) {
  if (labels.length < 2) return { defs: "", markup: "" };

  const scale = canvasScale(width, height);
  const pillCount = Math.min(labels.length, 3);
  const pillLabels = labels.slice(0, pillCount).map(shortenPillLabel).filter(Boolean);
  if (pillLabels.length < 2) return { defs: "", markup: "" };

  const sideMargin = Math.round(width * FEATURE_PILL.sideMarginRatio);
  const pillGap = Math.round(FEATURE_PILL.gap * scale);
  const rowW = width - sideMargin * 2;
  const pillW = Math.floor((rowW - pillGap * (pillLabels.length - 1)) / pillLabels.length);
  const pillH = Math.round(FEATURE_PILL.height * scale);
  const pillBottom = Math.round(FEATURE_PILL.bottomPad * scale);
  const pillY = height - pillBottom - pillH;
  const radius = Math.round(FEATURE_PILL.radius * scale);
  const strokeW = Math.max(1.5, Math.round(1.5 * scale));
  const dotR = Math.round(5 * scale);
  const dotGap = Math.round(10 * scale);
  const textPad = Math.round(16 * scale);
  const preferredFontSize = Math.round(FEATURE_PILL.fontSize * scale);
  const fontSize = fitPillFontSize(pillLabels, pillW - textPad * 2 - dotR * 2 - dotGap, preferredFontSize);

  let x = sideMargin;

  const markup = pillLabels
    .map((label) => {
      const textW = estimatePillTextWidth(label, fontSize);
      const contentW = dotR * 2 + dotGap + textW;
      const contentStart = x + (pillW - contentW) / 2;
      const dotCx = contentStart + dotR;
      const textX = contentStart + dotR * 2 + dotGap;
      const block = `
  <rect x="${x}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${radius}" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.16)" stroke-width="${strokeW}"/>
  <circle cx="${dotCx}" cy="${pillY + pillH / 2}" r="${dotR}" fill="${accentColor}"/>
  <text x="${textX}" y="${pillY + pillH / 2 + fontSize * 0.35}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="700" font-size="${fontSize}" fill="#f0f3f8">${escapeXml(label)}</text>`;
      x += pillW + pillGap;
      return block;
    })
    .join("");

  return { defs: "", markup };
}

async function buildTextOverlaySvg(input: {
  headline: string;
  headlineVerb?: string;
  headlineDescriptor?: string;
  subheadline: string;
  width: number;
  height: number;
  isCta: boolean;
  appName?: string;
  accentColor?: string;
  headlineAccent?: string;
  featureHighlights?: string[];
  showAppBranding?: boolean;
  layoutStyle?: SlideLayoutStyle;
  lockedTypography?: LockedTypography;
  locale?: LocaleCode;
  socialProof?: SocialProofInput;
  showSocialProof?: boolean;
  omitSubheadline?: boolean;
  asoBeat?: import("@/lib/campaignTypes").StoreSlideBeat;
}) {
  const {
    headline,
    headlineVerb,
    headlineDescriptor,
    subheadline,
    width,
    height,
    isCta,
    appName,
    accentColor = DEFAULT_ACCENT_COLOR,
    headlineAccent = "",
    featureHighlights = [],
    showAppBranding = false,
    layoutStyle,
    lockedTypography,
    locale,
    socialProof,
    showSocialProof = false,
    omitSubheadline = false,
    asoBeat,
  } = input;

  const scale = canvasScale(width, height);
  const profile = getCompositeLayoutProfile(width, height);
  const fontFamily = getSvgFontFamily(locale);
  const fontFaceDef = await getAsoFontFaceSvgDef(locale);
  const useBranding = Boolean(showAppBranding && appName && !isCta && profile.format === "app_store");
  const effectiveSubheadline = omitSubheadline ? "" : subheadline;
  const layout = computeAsoTextLayout(
    headline,
    effectiveSubheadline,
    headlineVerb,
    headlineDescriptor,
    width,
    height,
    isCta,
    lockedTypography,
    useBranding,
    locale,
  );

  const usePills =
    profile.showFeaturePills &&
    asoBeat === "hook" &&
    (layoutStyle === "hero_branded" || layoutStyle === "feature_pills") &&
    featureHighlights.length >= 2 &&
    !isCta;

  const featurePills = usePills
    ? buildFeaturePillsSvg(featureHighlights, accentColor, width, height)
    : { defs: "", markup: "" };

  const anchorX = layout.textAnchorX;
  const textAnchor = layout.textAnchor;
  let y = layout.textTopY;

  const verbElements = layout.verbLines
    .map((line) => {
      const el = renderGradientLine(line, anchorX, y, layout.verbSize, 900, textAnchor);
      y += Math.round(layout.verbSize * 1.05);
      return el;
    })
    .join("");

  const descriptorAccent =
    headlineAccent.trim() ||
    layout.descriptorLines[0]?.split(/\s+/).slice(-2).join(" ") ||
    "";

  const descriptorElements = layout.descriptorLines
    .map((line) => {
      const el = renderAccentInLine(
        line,
        descriptorAccent,
        anchorX,
        y,
        layout.descriptorSize,
        900,
        textAnchor,
      );
      y += Math.round(layout.descriptorSize * 1.15);
      return el;
    })
    .join("");

  if (layout.descriptorLines.length && layout.subLines.length) {
    y += Math.round(layout.descriptorSize * 0.42);
  } else if (layout.verbLines.length && layout.subLines.length) {
    y += Math.round(layout.verbSize * 0.28);
  }

  const subTspans = layout.subLines
    .map((line, index) => {
      const lineY = y + index * Math.round(layout.subSize * 1.28);
      return `<tspan x="${anchorX}" y="${lineY}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const captionBandH = Math.min(layout.textBlockBottom + Math.round(24 * scale), Math.round(height * 0.34));
  const scrimHeight = Math.max(layout.fadeHeight, captionBandH + Math.round(32 * scale));

  const socialProofMarkup =
    showSocialProof && socialProof
      ? buildSocialProofSvg({ socialProof, width, height, accentColor, fontFamily, scale })
      : "";

  return {
    svg: Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${fontFaceDef}
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="textFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="${isCta ? "0.62" : "0.58"}"/>
      <stop offset="45%" stop-color="#000000" stop-opacity="${isCta ? "0.38" : "0.32"}"/>
      <stop offset="75%" stop-color="#000000" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <filter id="textLegibility" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    ${featurePills.defs}
  </defs>
  <rect x="0" y="0" width="${width}" height="${scrimHeight}" fill="url(#textFade)"/>
  ${useBranding ? buildBrandingBarSvg(appName!, accentColor, width, scale) : ""}
  <g filter="url(#textLegibility)">
  ${verbElements.replaceAll(ASO_SVG_FONT_FAMILY, fontFamily)}
  ${descriptorElements.replaceAll(ASO_SVG_FONT_FAMILY, fontFamily)}
  </g>
  <text filter="url(#textShadow)" text-anchor="${textAnchor}" font-family="${fontFamily}" font-weight="700" font-size="${layout.subSize}" fill="${accentColor}" opacity="0.78">${subTspans}</text>
  ${featurePills.markup.replaceAll(ASO_SVG_FONT_FAMILY, fontFamily)}
  ${socialProofMarkup}
</svg>`),
    textBlockBottom: layout.textBlockBottom,
  };
}

function buildPhoneGlowSvg(layout: PhoneLayout, width: number, height: number, accentColor: string) {
  const uses3d = usesPerspectiveMockup(layout.mockupPose.orientation);
  const yaw = layout.mockupPose.orientation === "tilt_right" ? 1 : layout.mockupPose.orientation === "tilt_left" ? -1 : 0;
  const cx = layout.phoneX + layout.phoneW * (0.5 + yaw * 0.08);
  const cy = layout.phoneY + layout.phoneH * (uses3d ? 0.52 : 0.45);
  const rx = Math.round(layout.phoneW * (uses3d ? 0.72 : 0.58));
  const ry = Math.round(layout.phoneH * (uses3d ? 0.42 : 0.35));
  const opacity = uses3d ? 0.34 : 0.22;

  return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="phoneGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="${opacity}"/>
      <stop offset="55%" stop-color="${accentColor}" stop-opacity="${(opacity * 0.35).toFixed(2)}"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#phoneGlow)"/>
</svg>`);
}

async function buildPhoneStackLayer(
  layout: PhoneLayout,
  screenBuffer: Buffer,
  width: number,
  height: number,
  accentColor: string,
  mockupColor?: string,
  mockupAssetId?: MockupAssetId | null,
) {
  const orientation = layout.mockupPose.orientation;
  const phoneGlow = await sharp(buildPhoneGlowSvg(layout, width, height, accentColor)).png().toBuffer();

  if (layout.assetDevice) {
    const device = await renderAssetDeviceLayer(
      screenBuffer,
      orientation,
      layout.phoneW,
      layout.phoneH,
      mockupAssetId,
    );

    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: phoneGlow, top: 0, left: 0 },
        { input: device.buffer, top: layout.phoneY, left: layout.phoneX },
      ])
      .png()
      .toBuffer();
  }

  if (usesPerspectiveMockup(orientation)) {
    const device = await renderPerspectiveDeviceLayers(
      screenBuffer,
      orientation,
      layout.frontW,
      layout.phoneX,
      layout.phoneY,
      mockupColor,
    );

    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: phoneGlow, top: 0, left: 0 },
        { input: device.screen.buffer, top: device.screen.top, left: device.screen.left },
        { input: device.frame.buffer, top: device.frame.top, left: device.frame.left },
      ])
      .png()
      .toBuffer();
  }

  const frameBuffer = await getDeviceFrameBuffer(mockupColor, "upright");
  const resizedFrame = await sharp(frameBuffer)
    .resize(layout.frontW, layout.phoneH, { fit: "fill" })
    .png()
    .toBuffer();

  const screenLayer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: screenBuffer, top: layout.screenY, left: layout.screenX }])
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: phoneGlow, top: 0, left: 0 },
      { input: screenLayer, top: 0, left: 0 },
      { input: resizedFrame, top: layout.phoneY, left: layout.phoneX },
    ])
    .png()
    .toBuffer();
}

async function compositeDeviceFrame(
  base: Buffer,
  layout: PhoneLayout,
  screenBuffer: Buffer,
  width: number,
  height: number,
  accentColor: string,
  mockupColor?: string,
  mockupAssetId?: MockupAssetId | null,
) {
  const phoneStack = await buildPhoneStackLayer(
    layout,
    screenBuffer,
    width,
    height,
    accentColor,
    mockupColor,
    mockupAssetId,
  );

  return sharp(base).composite([{ input: phoneStack, top: 0, left: 0 }]).png().toBuffer();
}

export async function compositeMarketingSlide({
  background,
  screenshot,
  headline,
  headlineVerb,
  headlineDescriptor,
  subheadline,
  width,
  height,
  isCta = false,
  appName,
  accentColor = DEFAULT_ACCENT_COLOR,
  headlineAccent = "",
  featureHighlights = [],
  showAppBranding = false,
  layoutStyle,
  lockedTypography,
  mockupColor,
  mockupPose: rawMockupPose,
  mockupAssetId,
  slideNumber,
  locale,
  socialProof,
  showSocialProof = false,
  omitSubheadline = false,
  asoBeat,
}: CompositeMarketingSlideInput): Promise<Buffer> {
  let mockupPose = resolveCompositeMockupPose(rawMockupPose, slideNumber);
  const profile = getCompositeLayoutProfile(width, height);
  const hasPills =
    profile.showFeaturePills &&
    asoBeat === "hook" &&
    (layoutStyle === "hero_branded" || layoutStyle === "feature_pills") &&
    featureHighlights.length >= 2 &&
    !isCta &&
    !!screenshot;
  const reserveBottom = hasPills ? featurePillReserveHeight(width, height) : 0;

  const textOnly = isCta || !screenshot;
  const { svg: textOverlaySvg, textBlockBottom } = await buildTextOverlaySvg({
    headline,
    headlineVerb,
    headlineDescriptor,
    subheadline,
    width,
    height,
    isCta: textOnly,
    appName,
    accentColor,
    headlineAccent,
    featureHighlights,
    showAppBranding,
    layoutStyle,
    lockedTypography,
    locale,
    socialProof,
    showSocialProof,
    omitSubheadline,
    asoBeat,
  });

  const textOverlay = await sharp(textOverlaySvg).png().toBuffer();
  const base = await sharp(background)
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  if (!screenshot) {
    return sharp(base)
      .composite([{ input: textOverlay, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  const sceneAsset = getSceneMockupAsset(mockupAssetId);
  if (sceneAsset) {
    const withScreen = await renderSceneMockupLayer(base, screenshot, sceneAsset, width, height);
    return sharp(withScreen)
      .composite([{ input: textOverlay, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  if (mockupPose.placement === "auto") {
    const analysis = await analyzeBackgroundSubject(base, width, height);
    mockupPose = resolveSubjectAwarePose(mockupPose, analysis, width, height);
  }

  const screenshotBuffer = await sharp(screenshot).rotate().png().toBuffer();
  const layout = getPhoneLayout(width, height, textBlockBottom, reserveBottom, profile, mockupPose, mockupAssetId);
  const screenBuffer = await fitScreenshotToScreen(screenshotBuffer, layout);
  const withDevice = await compositeDeviceFrame(
    base,
    layout,
    screenBuffer,
    width,
    height,
    accentColor,
    mockupColor,
    mockupAssetId,
  );

  return sharp(withDevice)
    .composite([{ input: textOverlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
