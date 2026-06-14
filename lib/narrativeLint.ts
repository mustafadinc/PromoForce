import type { StrategyBrief } from "@/lib/campaignTypes";
import { headlineIncludesKeyword } from "@/lib/normalizeAsoCaption";
import { getBeatForSlide, storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

export type NarrativeLintIssue = {
  slideNumber?: number;
  severity: "warning" | "error";
  code: string;
  message: string;
};

export type NarrativeLintResult = {
  ok: boolean;
  criticalCount: number;
  warningCount: number;
  issues: NarrativeLintIssue[];
};

const HOOK_CTA_PATTERN =
  /\b(start now|download|get started|try free|install|sign up|başla|indir|hemen başla|jetzt starten|télécharger|descargar)\b/i;

function slideByNumber(strategy: StrategyBrief, n: number) {
  return strategy.slides.find((s) => s.slideNumber === n);
}

export function lintStrategyNarrative(strategy: StrategyBrief): NarrativeLintResult {
  const issues: NarrativeLintIssue[] = [];
  const slides = [...strategy.slides].sort((a, b) => a.slideNumber - b.slideNumber);

  for (const slide of slides) {
    const expectedBeat = getBeatForSlide(slide.slideNumber);
    if (slide.asoBeat !== expectedBeat) {
      issues.push({
        slideNumber: slide.slideNumber,
        severity: "error",
        code: "beat_mismatch",
        message: `Slide ${slide.slideNumber} should be "${storeSlideBeatMeta[expectedBeat].label}" (${expectedBeat}), not ${slide.asoBeat}.`,
      });
    }

    if (slide.keywordTheme && !headlineIncludesKeyword(slide.headline, slide.keywordTheme)) {
      issues.push({
        slideNumber: slide.slideNumber,
        severity: "warning",
        code: "keyword_missing",
        message: `Slide ${slide.slideNumber} headline should include keyword theme "${slide.keywordTheme}".`,
      });
    }
  }

  const hook = slideByNumber(strategy, 1);
  const problem = slideByNumber(strategy, 2);
  const cta = slideByNumber(strategy, 5);

  if (hook && HOOK_CTA_PATTERN.test(hook.headline)) {
    issues.push({
      slideNumber: 1,
      severity: "error",
      code: "hook_is_cta",
      message: "Slide 1 hook reads like a CTA — lead with pain or desire, not 'Start/Download'.",
    });
  }

  if (hook && problem) {
    const h = hook.headline.trim().toLowerCase();
    const p = problem.headline.trim().toLowerCase();
    if (h && h === p) {
      issues.push({
        slideNumber: 2,
        severity: "error",
        code: "duplicate_hook_problem",
        message: "Slide 2 repeats slide 1 headline — problem slide should advance the story.",
      });
    }
  }

  if (cta) {
    const ctaHead = cta.headline.trim().toLowerCase();
    const hasAction =
      HOOK_CTA_PATTERN.test(cta.headline) ||
      /\b(free|today|now)\b/i.test(cta.headline);
    if (!hasAction) {
      issues.push({
        slideNumber: 5,
        severity: "warning",
        code: "cta_weak_action",
        message: "Slide 5 CTA lacks clear action or urgency — add install/start language.",
      });
    }
    if (cta.subheadline.trim().length < 12) {
      issues.push({
        slideNumber: 5,
        severity: "warning",
        code: "cta_no_recap",
        message: "Slide 5 subheadline should recap benefits from earlier slides.",
      });
    }
    if (
      strategy.primaryMessage &&
      ctaHead &&
      !cta.subheadline.toLowerCase().includes(strategy.primaryMessage.toLowerCase().slice(0, 20)) &&
      cta.subheadline.length < 24
    ) {
      issues.push({
        slideNumber: 5,
        severity: "warning",
        code: "cta_primary_message",
        message: "Slide 5 should tie back to primary message and earlier benefits.",
      });
    }
  }

  const themes = slides.map((s) => s.keywordTheme?.trim().toLowerCase()).filter(Boolean);
  const dupTheme = themes.find((t, i) => t && themes.indexOf(t) !== i);
  if (dupTheme) {
    issues.push({
      severity: "warning",
      code: "duplicate_keyword_theme",
      message: `Keyword theme "${dupTheme}" is reused — each slide needs a unique ASO theme.`,
    });
  }

  const headlines = slides.map((s) => s.headline.trim().toLowerCase()).filter(Boolean);
  const dupHeadline = headlines.find((h, i) => headlines.indexOf(h) !== i);
  if (dupHeadline) {
    issues.push({
      severity: "error",
      code: "duplicate_headline",
      message: "Duplicate headlines detected — each slide must advance the conversion story.",
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    ok: criticalCount === 0,
    criticalCount,
    warningCount,
    issues,
  };
}
