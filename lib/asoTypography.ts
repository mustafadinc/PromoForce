/** ASO headline typography — aligned with claude-skill-aso-appstore-screenshots compose.py */

import type { LocaleCode } from "@/lib/locales";
import { getLocaleDefinition } from "@/lib/locales";

/** CSS font stack (web). */
export const ASO_FONT_FAMILY =
  "'Inter Black', 'Inter', 'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Must be double-quoted in SVG attributes — no nested single quotes. */
export const ASO_SVG_FONT_FAMILY = "Inter Black, Arial Black, Helvetica, Arial, sans-serif";

/** Headline max width as fraction of canvas — tighter margins read better on App Store. */
export const TEXT_SAFE_WIDTH_RATIO = 0.58;

export type LockedTypography = {
  verbSize: number;
  descriptorSize: number;
  subSize: number;
};

export type ScreenshotQualityRating = "great" | "usable" | "retake";

/** Per-glyph width factor for uppercase sans (Inter Black runs wide — leave headroom). */
const GLYPH_WIDTH_RATIO = 0.64;
const CJK_GLYPH_WIDTH_RATIO = 1.0;

function isCjkChar(char: string) {
  const code = char.charCodeAt(0);
  return code >= 0x3000 && code <= 0x9fff;
}

export function splitHeadlineParts(
  headline: string,
  headlineVerb?: string,
  headlineDescriptor?: string,
  locale?: LocaleCode,
): { verb: string; descriptor: string } {
  const localeDef = getLocaleDefinition(locale);

  if (localeDef.script === "cjk") {
    const full = headline.trim();
    return { verb: full, descriptor: "" };
  }

  const verb = headlineVerb?.trim();
  const descriptor = headlineDescriptor?.trim();

  if (verb && descriptor) {
    return localeDef.uppercase
      ? { verb: verb.toLocaleUpperCase(localeDef.bcp47), descriptor: descriptor.toLocaleUpperCase(localeDef.bcp47) }
      : { verb, descriptor };
  }

  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    const single = headline.trim();
    return localeDef.uppercase
      ? { verb: single.toLocaleUpperCase(localeDef.bcp47), descriptor: "" }
      : { verb: single, descriptor: "" };
  }

  const first = words[0];
  const rest = words.slice(1).join(" ");
  return localeDef.uppercase
    ? { verb: first.toLocaleUpperCase(localeDef.bcp47), descriptor: rest.toLocaleUpperCase(localeDef.bcp47) }
    : { verb: first, descriptor: rest };
}

export function estimateTextWidth(text: string, fontSize: number, locale?: LocaleCode): number {
  const localeDef = getLocaleDefinition(locale);
  const display = localeDef.uppercase ? text.toLocaleUpperCase(localeDef.bcp47) : text;
  let width = 0;

  for (const char of display) {
    if (localeDef.script === "cjk" || isCjkChar(char)) {
      width += fontSize * CJK_GLYPH_WIDTH_RATIO;
      continue;
    }
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
  locale?: LocaleCode,
): number {
  const trimmed = text.trim();
  if (!trimmed) return sizeMin;

  let lo = sizeMin;
  let hi = sizeMax;
  let best = sizeMin;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (estimateTextWidth(trimmed, mid, locale) <= maxWidth) {
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

export function wrapTextToMaxWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
  locale?: LocaleCode,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const localeDef = getLocaleDefinition(locale);

  if (localeDef.script === "cjk") {
    const lines: string[] = [];
    let current = "";
    for (const char of trimmed) {
      const next = current + char;
      if (estimateTextWidth(next, fontSize, locale) > maxWidth && current) {
        lines.push(current);
        current = char;
        if (lines.length >= maxLines) break;
      } else {
        current = next;
      }
    }
    if (lines.length < maxLines && current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (estimateTextWidth(next, fontSize, locale) > maxWidth && current) {
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
