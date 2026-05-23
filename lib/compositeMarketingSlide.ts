import sharp from "sharp";
import type { LockedTypography, SlideLayoutStyle } from "@/lib/campaignTypes";
import { getAsoFontFaceSvgDef } from "@/lib/asoFontEmbed";
import { computeAsoTextLayout, computeLockedTypographyFromHeadline, getBrandingMetrics } from "@/lib/asoTextLayout";
import {
  ASO_SVG_FONT_FAMILY,
} from "@/lib/asoTypography";
import {
  APP_STORE_GENERATION_HEIGHT,
  APP_STORE_GENERATION_WIDTH,
  isAppStorePortraitAspect,
  parseImageSize,
} from "@/lib/appStoreImageSizes";
import {
  DEVICE_BEZEL,
  DEVICE_FRAME_HEIGHT,
  DEVICE_FRAME_WIDTH,
  DEVICE_SCREEN_CORNER_R,
  getDeviceFrameBuffer,
} from "@/lib/generateDeviceFrame";
import { DEFAULT_ACCENT_COLOR } from "@/lib/storeCreativeDirector";

export { parseImageSize };
export type { LockedTypography };

const MIN_TEXT_DEVICE_GAP = 48;
const DEVICE_W_RATIO = 980 / 1290;
/** Minimum gap above feature pills / canvas bottom so the full device chin stays visible. */
const BOTTOM_SAFE_MARGIN = 64;
const MIN_PHONE_W_RATIO = 0.5;
const FRAME_ASPECT = DEVICE_FRAME_HEIGHT / DEVICE_FRAME_WIDTH;

/** Bottom feature pills — reference px at 1280×2784 (≈ subheadline scale on hero slides). */
const FEATURE_PILL = {
  height: 118,
  fontSize: 44,
  bottomPad: 76,
  gap: 22,
  radius: 30,
  dotRadius: 10,
  textInset: 52,
  barWidthRatio: 0.92,
} as const;

function canvasScale(width: number, height: number) {
  const wScale = width / APP_STORE_GENERATION_WIDTH;
  const hScale = height / APP_STORE_GENERATION_HEIGHT;
  return Math.max(wScale, hScale);
}

function featurePillReserveHeight(width: number, height: number) {
  const scale = canvasScale(width, height);
  return Math.round((FEATURE_PILL.bottomPad + FEATURE_PILL.height + 36) * scale);
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
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getPhoneLayout(
  width: number,
  height: number,
  textBlockBottom: number,
  reserveBottom = 0,
): PhoneLayout {
  const appStoreAspect = isAppStorePortraitAspect(width, height);
  const scale = width / APP_STORE_GENERATION_WIDTH;

  if (appStoreAspect) {
    const bottomMargin = Math.max(Math.round(BOTTOM_SAFE_MARGIN * scale), reserveBottom);
    const topBound = textBlockBottom + MIN_TEXT_DEVICE_GAP;
    const bottomBound = height - bottomMargin;
    const availableH = Math.max(0, bottomBound - topBound);

    const preferredPhoneW = Math.round(width * DEVICE_W_RATIO);
    const maxPhoneWFromHeight =
      availableH > 0 ? Math.round(availableH / FRAME_ASPECT) : preferredPhoneW;
    const minPhoneW = Math.round(width * MIN_PHONE_W_RATIO);

    let phoneW = Math.min(preferredPhoneW, maxPhoneWFromHeight);
    if (phoneW < minPhoneW && maxPhoneWFromHeight >= minPhoneW) {
      phoneW = minPhoneW;
    }
    phoneW = Math.max(Math.round(width * 0.42), phoneW);

    const frameScale = phoneW / DEVICE_FRAME_WIDTH;
    const phoneH = Math.round(DEVICE_FRAME_HEIGHT * frameScale);
    const phoneY = Math.max(topBound, bottomBound - phoneH);
    const phoneX = Math.round((width - phoneW) / 2);
    const bezel = Math.max(16, Math.round(DEVICE_BEZEL * frameScale));
    const screenX = phoneX + bezel;
    const screenY = phoneY + bezel;
    const screenW = phoneW - bezel * 2;
    const screenH = phoneH - bezel * 2;
    const screenRadius = Math.round(DEVICE_SCREEN_CORNER_R * frameScale);

    return {
      phoneX,
      phoneY,
      phoneW,
      phoneH,
      screenX,
      screenY,
      screenW,
      screenH,
      screenRadius,
    };
  }

  const phoneW = Math.round(width * 0.44);
  const phoneH = Math.round(phoneW * FRAME_ASPECT);
  const bottomMargin = Math.max(Math.round(BOTTOM_SAFE_MARGIN * scale), reserveBottom);
  const topBound = textBlockBottom + MIN_TEXT_DEVICE_GAP;
  const bottomBound = height - bottomMargin;
  const phoneY = Math.max(topBound, bottomBound - phoneH);
  const phoneX = Math.round((width - phoneW) / 2);
  const bezel = Math.max(14, Math.round(phoneW * 0.028));

  return {
    phoneX,
    phoneY,
    phoneW,
    phoneH,
    screenX: phoneX + bezel,
    screenY: phoneY + bezel,
    screenW: phoneW - bezel * 2,
    screenH: phoneH - bezel * 2,
    screenRadius: Math.round((phoneW - bezel * 2) * 0.112),
  };
}

async function roundImageCorners(input: Buffer, w: number, h: number, radius: number) {
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  return sharp(input)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function renderAccentInLine(
  line: string,
  accentPhrase: string,
  centerX: number,
  y: number,
  fontSize: number,
  fontWeight: number,
): string {
  const trimmedAccent = accentPhrase.trim();
  if (!trimmedAccent) {
    return `<text filter="url(#textShadow)" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}" fill="#ffffff"><tspan x="${centerX}" y="${y}">${escapeXml(line)}</tspan></text>`;
  }

  const idx = line.toLowerCase().indexOf(trimmedAccent.toLowerCase());
  if (idx === -1) {
    return `<text filter="url(#textShadow)" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}" fill="#ffffff"><tspan x="${centerX}" y="${y}">${escapeXml(line)}</tspan></text>`;
  }

  const before = line.slice(0, idx);
  const accent = line.slice(idx, idx + trimmedAccent.length);
  const after = line.slice(idx + trimmedAccent.length);

  return `<text filter="url(#textShadow)" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="${fontWeight}" font-size="${fontSize}">
    <tspan x="${centerX}" y="${y}" fill="#ffffff">${escapeXml(before)}</tspan><tspan fill="url(#accentGrad)">${escapeXml(accent)}</tspan><tspan fill="#ffffff">${escapeXml(after)}</tspan>
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
    width += char === " " ? fontSize * 0.34 : fontSize * 0.54;
  }
  return width;
}

function fitPillFontSize(label: string, maxTextWidth: number, preferred: number) {
  const min = Math.round(preferred * 0.68);
  let size = preferred;
  while (size >= min) {
    if (estimatePillTextWidth(label, size) <= maxTextWidth) return size;
    size -= 2;
  }
  return min;
}

function buildFeaturePillsSvg(labels: string[], accentColor: string, width: number, height: number) {
  if (labels.length < 2) return "";

  const scale = canvasScale(width, height);
  const pillCount = Math.min(labels.length, 3);
  const pillGap = Math.round(FEATURE_PILL.gap * scale);
  const pillW = Math.round((width * FEATURE_PILL.barWidthRatio) / pillCount - pillGap);
  const pillH = Math.round(FEATURE_PILL.height * scale);
  const pillBottom = Math.round(FEATURE_PILL.bottomPad * scale);
  const pillY = height - pillBottom - pillH;
  const startX = (width - (pillW * pillCount + pillGap * (pillCount - 1))) / 2;
  const preferredFontSize = Math.round(FEATURE_PILL.fontSize * scale);
  const radius = Math.round(FEATURE_PILL.radius * scale);
  const dotR = Math.round(FEATURE_PILL.dotRadius * scale);
  const textPadX = Math.round(FEATURE_PILL.textInset * scale);
  const strokeW = Math.max(2, Math.round(2 * scale));
  const maxTextWidth = pillW - textPadX - Math.round(12 * scale);

  return labels
    .slice(0, pillCount)
    .map((label, index) => {
      const x = startX + index * (pillW + pillGap);
      const fontSize = fitPillFontSize(label, maxTextWidth, preferredFontSize);
      return `
    <rect x="${x}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${radius}" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" stroke-width="${strokeW}"/>
    <circle cx="${x + textPadX * 0.55}" cy="${pillY + pillH / 2}" r="${dotR}" fill="${accentColor}"/>
    <text x="${x + textPadX}" y="${pillY + pillH / 2 + fontSize * 0.36}" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffffff">${escapeXml(label)}</text>`;
    })
    .join("");
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
  } = input;

  const scale = width / APP_STORE_GENERATION_WIDTH;
  const centerX = width / 2;
  const fontFaceDef = await getAsoFontFaceSvgDef();
  const useBranding = Boolean(showAppBranding && appName && !isCta);
  const layout = computeAsoTextLayout(
    headline,
    subheadline,
    headlineVerb,
    headlineDescriptor,
    width,
    height,
    isCta,
    lockedTypography,
    useBranding,
  );

  const usePills =
    (layoutStyle === "hero_branded" || layoutStyle === "feature_pills") &&
    featureHighlights.length >= 2 &&
    !isCta;

  let y = layout.textTopY;

  const verbElements = layout.verbLines
    .map((line) => {
      const el = renderAccentInLine(line, headlineAccent, centerX, y, layout.verbSize, 900);
      y += Math.round(layout.verbSize * 1.05);
      return el;
    })
    .join("");

  const descriptorElements = layout.descriptorLines
    .map((line) => {
      const el = renderAccentInLine(line, headlineAccent, centerX, y, layout.descriptorSize, 900);
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
      return `<tspan x="${centerX}" y="${lineY}">${escapeXml(line)}</tspan>`;
    })
    .join("");

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
      <stop offset="0%" stop-color="#000000" stop-opacity="${isCta ? "0.72" : "0.68"}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${width}" height="${layout.fadeHeight}" fill="url(#textFade)"/>
  ${useBranding ? buildBrandingBarSvg(appName!, accentColor, width, scale) : ""}
  ${verbElements}
  ${descriptorElements}
  <text filter="url(#textShadow)" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="700" font-size="${layout.subSize}" fill="#f0f3f8">${subTspans}</text>
  ${usePills ? buildFeaturePillsSvg(featureHighlights, accentColor, width, height) : ""}
</svg>`),
    textBlockBottom: layout.textBlockBottom,
  };
}

function buildPhoneGlowSvg(layout: PhoneLayout, width: number, height: number, accentColor: string) {
  const cx = layout.phoneX + layout.phoneW / 2;
  const cy = layout.phoneY + layout.phoneH * 0.45;

  return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="phoneGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${Math.round(layout.phoneW * 0.58)}" ry="${Math.round(layout.phoneH * 0.35)}" fill="url(#phoneGlow)"/>
</svg>`);
}

async function fitScreenshotToScreen(screenshot: Buffer, layout: PhoneLayout) {
  const screenshotBuffer = await sharp(screenshot).rotate().png().toBuffer();
  const targetW = layout.screenW;
  const targetH = layout.screenH;

  const widthScaled = await sharp(screenshotBuffer).resize({ width: targetW }).png().toBuffer();
  const scaledMeta = await sharp(widthScaled).metadata();
  const scaledH = scaledMeta.height ?? targetH;

  let fitted: Buffer;
  if (scaledH >= targetH) {
    fitted = await sharp(widthScaled)
      .extract({ left: 0, top: 0, width: targetW, height: targetH })
      .png()
      .toBuffer();
  } else {
    fitted = await sharp(widthScaled)
      .extend({
        top: 0,
        bottom: targetH - scaledH,
        left: 0,
        right: 0,
        background: { r: 8, g: 8, b: 10, alpha: 1 },
      })
      .png()
      .toBuffer();
  }

  return roundImageCorners(fitted, targetW, targetH, layout.screenRadius);
}

async function compositeDeviceFrame(
  base: Buffer,
  layout: PhoneLayout,
  roundedScreen: Buffer,
  width: number,
  height: number,
  accentColor: string,
) {
  const frameBuffer = await getDeviceFrameBuffer();
  const frameW = layout.phoneW;
  const frameScale = frameW / DEVICE_FRAME_WIDTH;
  const frameH = Math.round(DEVICE_FRAME_HEIGHT * frameScale);

  const resizedFrame = await sharp(frameBuffer).resize(frameW, frameH).png().toBuffer();

  const phoneGlow = await sharp(buildPhoneGlowSvg(layout, width, height, accentColor)).png().toBuffer();

  const screenLayer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: roundedScreen, top: layout.screenY, left: layout.screenX }])
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      { input: phoneGlow, top: 0, left: 0 },
      { input: screenLayer, top: 0, left: 0 },
      { input: resizedFrame, top: layout.phoneY, left: layout.phoneX },
    ])
    .png()
    .toBuffer();
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
}: CompositeMarketingSlideInput): Promise<Buffer> {
  const hasPills =
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

  const screenshotBuffer = await sharp(screenshot).rotate().png().toBuffer();
  const layout = getPhoneLayout(width, height, textBlockBottom, reserveBottom);
  const roundedScreen = await fitScreenshotToScreen(screenshotBuffer, layout);
  const withDevice = await compositeDeviceFrame(base, layout, roundedScreen, width, height, accentColor);

  return sharp(withDevice)
    .composite([{ input: textOverlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
