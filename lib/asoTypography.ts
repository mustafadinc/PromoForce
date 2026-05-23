/** ASO headline typography — aligned with claude-skill-aso-appstore-screenshots compose.py */

/** CSS font stack (web). */
export const ASO_FONT_FAMILY =
  "'Inter Black', 'Inter', 'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Must be double-quoted in SVG attributes — no nested single quotes. */
export const ASO_SVG_FONT_FAMILY = "Inter Black, Arial Black, Helvetica, Arial, sans-serif";

/** Headline max width as fraction of canvas — tighter margins read better on App Store. */
export const TEXT_SAFE_WIDTH_RATIO = 0.62;

export type LockedTypography = {
  verbSize: number;
  descriptorSize: number;
  subSize: number;
};

export type ScreenshotQualityRating = "great" | "usable" | "retake";

/** Per-glyph width factor for uppercase sans (Inter Black runs wide — leave headroom). */
const GLYPH_WIDTH_RATIO = 0.64;

export function splitHeadlineParts(
  headline: string,
  headlineVerb?: string,
  headlineDescriptor?: string,
): { verb: string; descriptor: string } {
  const verb = headlineVerb?.trim();
  const descriptor = headlineDescriptor?.trim();

  if (verb && descriptor) {
    return { verb: verb.toUpperCase(), descriptor: descriptor.toUpperCase() };
  }

  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return { verb: headline.trim().toUpperCase(), descriptor: "" };
  }

  return {
    verb: words[0].toUpperCase(),
    descriptor: words.slice(1).join(" ").toUpperCase(),
  };
}

export function estimateTextWidth(text: string, fontSize: number): number {
  const upper = text.toUpperCase();
  let width = 0;
  for (const char of upper) {
    if (char === " ") {
      width += fontSize * 0.28;
    } else if (char === "I" || char === "i") {
      width += fontSize * 0.22;
    } else if (char === "W" || char === "M") {
      width += fontSize * 0.78;
    } else {
      width += fontSize * GLYPH_WIDTH_RATIO;
    }
  }
  return width;
}

/**
 * Binary-search max font size that fits maxWidth (repo fit_font style).
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  sizeMax: number,
  sizeMin: number,
): number {
  const upper = text.toUpperCase().trim();
  if (!upper) return sizeMin;

  let lo = sizeMin;
  let hi = sizeMax;
  let best = sizeMin;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (estimateTextWidth(upper, mid) <= maxWidth) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/** Intentionally disabled — stretching single words edge-to-edge clips and looks amateur. */
export function svgTextLengthAttrs(_text: string, _targetWidth: number, _fontSize: number): string {
  return "";
}

export function wrapTextToMaxWidth(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (estimateTextWidth(next, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}
