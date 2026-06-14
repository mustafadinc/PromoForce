import type { LocaleCode } from "@/lib/locales";
import { getLocaleDefinition } from "@/lib/locales";
import { HOOK_MAX_WORDS, DEFAULT_MAX_HEADLINE_WORDS } from "@/lib/readabilityScore";

const BANNED_ADVERBS = /\b(easily|smoothly|simply|magically|effortlessly|seamlessly|quickly)\b/gi;

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ");
}

export function sanitizeCaptionText(text: string) {
  return text.replace(BANNED_ADVERBS, "").replace(/\s+/g, " ").trim();
}

export function normalizeCaptionForSlide(input: {
  headline: string;
  headlineVerb?: string;
  headlineDescriptor?: string;
  subheadline?: string;
  keywordTheme?: string;
  asoBeat?: "hook" | "problem_outcome" | "feature_benefit" | "social_proof" | "download_cta";
  locale?: LocaleCode;
}): {
  headline: string;
  headlineVerb: string;
  headlineDescriptor: string;
  subheadline: string;
} {
  const locale = getLocaleDefinition(input.locale);
  let headline = sanitizeCaptionText(input.headline);
  let subheadline = sanitizeCaptionText(input.subheadline || "");

  const maxWords =
    input.asoBeat === "hook" ? Math.min(locale.captionMaxWords, HOOK_MAX_WORDS) : locale.captionMaxWords;

  if (locale.script === "cjk") {
    if (headline.length > locale.captionMaxChars) {
      headline = headline.slice(0, locale.captionMaxChars).trim();
    }
    return {
      headline,
      headlineVerb: headline,
      headlineDescriptor: "",
      subheadline: input.asoBeat === "hook" ? "" : subheadline.slice(0, locale.captionMaxChars * 2),
    };
  }

  headline = trimWords(headline, maxWords);
  if (locale.uppercase) {
    headline = headline.toLocaleUpperCase(locale.bcp47);
  }

  const words = headline.split(/\s+/).filter(Boolean);
  const verb = (input.headlineVerb || words[0] || headline).trim();
  const descriptor = (input.headlineDescriptor || words.slice(1).join(" ") || "").trim();

  const headlineVerb = locale.uppercase ? verb.toLocaleUpperCase(locale.bcp47) : verb;
  const headlineDescriptor = locale.uppercase
    ? descriptor.toLocaleUpperCase(locale.bcp47)
    : descriptor;

  const fullHeadline = headlineDescriptor ? `${headlineVerb} ${headlineDescriptor}` : headlineVerb;

  return {
    headline: fullHeadline,
    headlineVerb,
    headlineDescriptor,
    subheadline: input.asoBeat === "hook" ? "" : subheadline.slice(0, 120),
  };
}

export function headlineIncludesKeyword(headline: string, keywordTheme?: string) {
  if (!keywordTheme?.trim()) return true;
  const theme = keywordTheme.trim().toLowerCase();
  return headline.toLowerCase().includes(theme);
}
