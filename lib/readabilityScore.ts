import type { GeneratedSlide, StoreSlideBeat, StoreSlidePlan } from "@/lib/campaignTypes";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

export type ReadabilityIssue = {
  slideNumber: number;
  code: "headline_long" | "headline_empty" | "subheadline_long" | "weak_hierarchy";
  message: string;
  severity: "warning" | "error";
};

export type SlideReadabilityScore = {
  slideNumber: number;
  score: number;
  issues: ReadabilityIssue[];
};

export type ReadabilityReport = {
  overallScore: number;
  issues: ReadabilityIssue[];
  slideScores: SlideReadabilityScore[];
};

const HOOK_MAX_WORDS = 6;
const DEFAULT_MAX_HEADLINE_WORDS = 10;
const MAX_SUBHEADLINE_CHARS = 120;

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scoreSlide(slide: Pick<StoreSlidePlan, "slideNumber" | "asoBeat" | "headline" | "subheadline">): SlideReadabilityScore {
  const issues: ReadabilityIssue[] = [];
  const headlineWords = countWords(slide.headline);
  const maxHeadline =
    slide.asoBeat === "hook" ? HOOK_MAX_WORDS : DEFAULT_MAX_HEADLINE_WORDS;

  if (!slide.headline.trim()) {
    issues.push({
      slideNumber: slide.slideNumber,
      code: "headline_empty",
      message: "Headline is empty.",
      severity: "error",
    });
  } else if (headlineWords > maxHeadline) {
    issues.push({
      slideNumber: slide.slideNumber,
      code: "headline_long",
      message: `Headline has ${headlineWords} words (max ${maxHeadline} for ${storeSlideBeatMeta[slide.asoBeat].label}).`,
      severity: slide.asoBeat === "hook" ? "error" : "warning",
    });
  }

  if (slide.subheadline.length > MAX_SUBHEADLINE_CHARS) {
    issues.push({
      slideNumber: slide.slideNumber,
      code: "subheadline_long",
      message: `Subheadline is ${slide.subheadline.length} chars — may truncate on App Store.`,
      severity: "warning",
    });
  }

  let score = 100;
  for (const issue of issues) {
    score -= issue.severity === "error" ? 25 : 12;
  }

  return {
    slideNumber: slide.slideNumber,
    score: Math.max(0, Math.min(100, score)),
    issues,
  };
}

export function scoreStrategySlides(
  slides: Array<Pick<StoreSlidePlan, "slideNumber" | "asoBeat" | "headline" | "subheadline">>,
): ReadabilityReport {
  const slideScores = slides.map((slide) => scoreSlide(slide));
  const issues = slideScores.flatMap((s) => s.issues);
  const overallScore =
    slideScores.length === 0
      ? 0
      : Math.round(slideScores.reduce((sum, s) => sum + s.score, 0) / slideScores.length);

  return { overallScore, issues, slideScores };
}

export function scoreGeneratedSlides(slides: GeneratedSlide[]): ReadabilityReport {
  return scoreStrategySlides(
    slides.map((slide) => ({
      slideNumber: slide.slideNumber,
      asoBeat: slide.asoBeat ?? "feature_benefit",
      headline: slide.headline,
      subheadline: slide.subheadline,
    })),
  );
}
