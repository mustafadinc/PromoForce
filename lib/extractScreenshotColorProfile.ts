import sharp from "sharp";
import type { ScreenshotColorProfile, ScreenshotUiTone } from "@/lib/campaignTypes";

const SAMPLE_SIZE = 96;
const QUANTIZE = 28;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function isNeutral(r: number, g: number, b: number) {
  const lum = relativeLuminance(r, g, b);
  if (lum > 0.94 || lum < 0.04) return true;
  return saturation(r, g, b) < 0.08 && lum > 0.12 && lum < 0.88;
}

type ColorBucket = {
  r: number;
  g: number;
  b: number;
  count: number;
};

function mergeBuckets(target: Map<string, ColorBucket>, source: Map<string, ColorBucket>) {
  for (const [key, bucket] of source) {
    const existing = target.get(key);
    if (existing) {
      existing.r += bucket.r;
      existing.g += bucket.g;
      existing.b += bucket.b;
      existing.count += bucket.count;
    } else {
      target.set(key, { ...bucket });
    }
  }
}

async function sampleImageBuckets(file: File): Promise<Map<string, ColorBucket>> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, ColorBucket>();
  const channels = info.channels;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (isNeutral(r, g, b)) continue;

    const qr = Math.round(r / QUANTIZE) * QUANTIZE;
    const qg = Math.round(g / QUANTIZE) * QUANTIZE;
    const qb = Math.round(b / QUANTIZE) * QUANTIZE;
    const key = `${qr},${qg},${qb}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  return buckets;
}

function averageBucketColor(bucket: ColorBucket) {
  return {
    r: bucket.r / bucket.count,
    g: bucket.g / bucket.count,
    b: bucket.b / bucket.count,
  };
}

function pickAccentAndSecondary(
  ranked: Array<{ hex: string; r: number; g: number; b: number; count: number; sat: number }>,
  uiTone: ScreenshotUiTone,
) {
  const vibrant = [...ranked].sort((a, b) => b.sat - a.sat || b.count - a.count);
  const accentCandidate = vibrant.find((color) => color.sat >= 0.18) ?? ranked[0];
  const secondaryCandidate =
    vibrant.find((color) => color.hex !== accentCandidate?.hex && color.sat >= 0.12) ??
    ranked.find((color) => color.hex !== accentCandidate?.hex) ??
    accentCandidate;

  if (!accentCandidate) {
    return {
      accentColor: uiTone === "light" ? "#6366f1" : "#45d6b5",
      secondaryColor: uiTone === "light" ? "#a5b4fc" : "#2dd4bf",
    };
  }

  return {
    accentColor: accentCandidate.hex,
    secondaryColor: secondaryCandidate?.hex ?? accentCandidate.hex,
  };
}

function deriveBackgroundBase(uiTone: ScreenshotUiTone, dominantColors: string[]) {
  if (uiTone === "light") {
    return dominantColors[0] ?? "#f4f4f5";
  }
  if (uiTone === "dark") {
    return (
      dominantColors.find((hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return relativeLuminance(r, g, b) < 0.35;
      }) ?? "#111827"
    );
  }
  return dominantColors[0] ?? "#1f2937";
}

export function buildScreenshotHarmonyGuidance(profile: ScreenshotColorProfile): string {
  const palette = profile.dominantColors.join(", ");

  if (profile.uiTone === "light") {
    return [
      `App screenshots use a light, bright UI (${palette}).`,
      `Marketing backgrounds must feel airy and luminous — soft daylight interiors, pale wood, cream walls, gentle pastels, high-key photography.`,
      `Headline accent gradients and glow effects should use ${profile.accentColor} blending into ${profile.secondaryColor}.`,
      `Avoid dark moody voids or heavy noir grading that fights the app UI.`,
    ].join(" ");
  }

  if (profile.uiTone === "dark") {
    return [
      `App screenshots use a dark UI (${palette}).`,
      `Marketing backgrounds should be cinematic dark environments with colored rim light in ${profile.accentColor}.`,
      `Headline gradients and accent glows: ${profile.accentColor} → ${profile.secondaryColor}.`,
      `Keep the set cohesive with deep shadows and premium contrast.`,
    ].join(" ");
  }

  return [
    `App screenshots mix light and dark surfaces (${palette}).`,
    `Backgrounds should bridge both — balanced exposure, soft gradients anchored in ${profile.accentColor} and ${profile.secondaryColor}.`,
    `Headline accents use the same palette for a unified brand world.`,
  ].join(" ");
}

export async function extractScreenshotColorProfile(files: File[]): Promise<ScreenshotColorProfile | null> {
  if (!files.length) return null;

  const merged = new Map<string, ColorBucket>();
  let luminanceSum = 0;
  let luminanceCount = 0;

  for (const file of files) {
    const buckets = await sampleImageBuckets(file);
    mergeBuckets(merged, buckets);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += info.channels) {
      luminanceSum += relativeLuminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      luminanceCount += 1;
    }
  }

  const ranked = [...merged.values()]
    .map((bucket) => {
      const { r, g, b } = averageBucketColor(bucket);
      return {
        r,
        g,
        b,
        count: bucket.count,
        sat: saturation(r, g, b),
        hex: rgbToHex(r, g, b),
      };
    })
    .sort((a, b) => b.count - a.count);

  if (!ranked.length) return null;

  const avgLuminance = luminanceCount ? luminanceSum / luminanceCount : 0.5;
  const uiTone: ScreenshotUiTone =
    avgLuminance > 0.58 ? "light" : avgLuminance < 0.38 ? "dark" : "mixed";

  const dominantColors = ranked.slice(0, 4).map((entry) => entry.hex);
  const { accentColor, secondaryColor } = pickAccentAndSecondary(ranked, uiTone);
  const backgroundBase = deriveBackgroundBase(uiTone, dominantColors);

  const profile: ScreenshotColorProfile = {
    uiTone,
    averageLuminance: Math.round(avgLuminance * 100) / 100,
    dominantColors,
    accentColor,
    secondaryColor,
    backgroundBase,
    harmonyGuidance: "",
  };

  profile.harmonyGuidance = buildScreenshotHarmonyGuidance(profile);
  return profile;
}
