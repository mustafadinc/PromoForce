import type {
  AppProfile,
  ScreenshotAssessment,
  ScreenshotIntelligence,
  StoreSlidePlan,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { normalizeHeadlineFields } from "@/lib/storeCreativeDirector";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

function assessmentForIndex(
  strategy: StrategyBrief,
  index: number,
): ScreenshotAssessment | undefined {
  const intel = strategy.screenshotIntelligence?.find((row) => row.index === index);
  if (intel) {
    return {
      index: intel.index,
      rating: intel.rating,
      issues: intel.issues,
      retakeGuidance: intel.retakeGuidance,
      description: intel.description,
    };
  }
  return strategy.screenshotAssessments?.find((row) => row.index === index);
}

function intelligenceForIndex(strategy: StrategyBrief, index: number): ScreenshotIntelligence | undefined {
  return strategy.screenshotIntelligence?.find((row) => row.index === index);
}

function pickHeadlineForSlide(intel: ScreenshotIntelligence, slide: StoreSlidePlan): string {
  const headlines = intel.suggestedHeadlines.filter(Boolean);
  if (!headlines.length) return slide.headline;

  const beatMatch = headlines.find((line) =>
    line.toLowerCase().includes(storeSlideBeatMeta[slide.asoBeat].label.toLowerCase().split(" ")[0] ?? ""),
  );
  if (beatMatch) return beatMatch;

  const recommended = intel.recommendedSlideBeats ?? [];
  if (recommended.includes(slide.asoBeat) && headlines[0]) {
    return headlines[0];
  }

  return headlines[0];
}

function pickSubheadline(intel: ScreenshotIntelligence, profile: AppProfile, slide: StoreSlidePlan): string {
  const benefit = intel.suggestedBenefits.find(Boolean);
  if (benefit) return benefit;

  const hook = intel.suggestedSocialHooks.find(Boolean);
  if (hook) return hook;

  const action = intel.primaryUserAction?.trim();
  if (action) return `${action} with ${profile.appName}.`;

  return slide.subheadline;
}

function buildScreenshotRationale(
  intel: ScreenshotIntelligence | undefined,
  assessment: ScreenshotAssessment | undefined,
  slide: StoreSlidePlan,
  screenIndex: number,
): string {
  const beatLabel = storeSlideBeatMeta[slide.asoBeat].label;
  const description =
    intel?.description?.trim() ||
    assessment?.description?.trim() ||
    `Screen ${screenIndex + 1} content.`;

  const proof =
    intel?.primaryUserAction?.trim() ||
    intel?.detectedFeatures.slice(0, 2).join(", ") ||
    intel?.uiElements.slice(0, 2).join(", ");

  return proof
    ? `${description} Best for ${beatLabel}: ${proof}.`
    : `${description} Supports the ${beatLabel} beat for this slide.`;
}

function buildVisualVariantHint(intel: ScreenshotIntelligence | undefined, slide: StoreSlidePlan): string | undefined {
  if (!intel) return undefined;
  const features = intel.detectedFeatures.slice(0, 3).join(", ");
  if (!features) return undefined;
  const base = storeSlideBeatMeta[slide.asoBeat].visualVariantHint;
  return `${base} Highlight on-screen: ${features}.`;
}

export type SlideScreenshotSyncResult = {
  patch: Partial<StoreSlidePlan>;
  /** Shown in UI after user picks a different screen. */
  message: string;
  /** Other slides already assigned to this screenshot index. */
  conflictingSlides: number[];
};

export function findSlidesUsingScreenshot(
  strategy: StrategyBrief,
  screenshotIndex: number,
  exceptSlideNumber?: number,
): number[] {
  return strategy.slides
    .filter(
      (s) =>
        s.screenshotUsage !== "none" &&
        s.screenshotIndex === screenshotIndex &&
        s.slideNumber !== exceptSlideNumber,
    )
    .map((s) => s.slideNumber);
}

/**
 * When the user picks another screenshot for a slide, refresh copy + QA fields
 * from pre-analyzed intelligence so the plan stays coherent.
 */
export function buildSlidePatchForScreenshot(
  strategy: StrategyBrief,
  slide: StoreSlidePlan,
  screenshotIndex: number,
  appProfile: AppProfile,
): SlideScreenshotSyncResult {
  const intel = intelligenceForIndex(strategy, screenshotIndex);
  const assessment = assessmentForIndex(strategy, screenshotIndex);
  const conflictingSlides = findSlidesUsingScreenshot(strategy, screenshotIndex, slide.slideNumber);

  const headlineSource = intel ? pickHeadlineForSlide(intel, slide) : slide.headline;
  const headlines = normalizeHeadlineFields({
    headline: headlineSource,
    headlineVerb: undefined,
    headlineDescriptor: undefined,
  });

  const patch: Partial<StoreSlidePlan> = {
    screenshotIndex,
    screenshotRationale: buildScreenshotRationale(intel, assessment, slide, screenshotIndex),
    screenshotRating: assessment?.rating ?? intel?.rating,
    screenshotIssues: assessment?.issues ?? intel?.issues,
    retakeGuidance: assessment?.retakeGuidance ?? intel?.retakeGuidance,
    ...headlines,
    subheadline: intel ? pickSubheadline(intel, appProfile, slide) : slide.subheadline,
  };

  const visualVariant = buildVisualVariantHint(intel, slide);
  if (visualVariant) {
    patch.visualVariant = visualVariant;
  }

  if (intel?.tags.length) {
    const accent = intel.tags[0].split(/\s+/).slice(0, 2).join(" ");
    if (accent.length >= 3 && accent.length <= 28) {
      patch.headlineAccent = accent;
    }
  }

  const conflictNote =
    conflictingSlides.length > 0
      ? ` Slides ${conflictingSlides.join(", ")} also use Screen ${screenshotIndex + 1} — consider swapping one.`
      : "";

  return {
    patch,
    message: `Copy and notes updated for Screen ${screenshotIndex + 1}.${conflictNote}`,
    conflictingSlides,
  };
}

export function shouldSyncSlideToScreenshot(
  slide: StoreSlidePlan,
  patch: Partial<StoreSlidePlan>,
): patch is { screenshotIndex: number } {
  if (patch.screenshotIndex === undefined || patch.screenshotIndex === null) return false;
  if (slide.screenshotUsage === "none") return false;
  return patch.screenshotIndex !== slide.screenshotIndex;
}

function ratingScore(rating: ScreenshotIntelligence["rating"]): number {
  if (rating === "great") return 0;
  if (rating === "usable") return 1;
  return 2;
}

/**
 * After strategy + intelligence are both available, assign each slide the best-matching
 * screen and sync copy from intelligence (fixes hook text on a settings screen, etc.).
 */
export function alignStoreStrategyToIntelligence(
  strategy: StrategyBrief,
  appProfile: AppProfile,
): StrategyBrief {
  const intelligence = strategy.screenshotIntelligence;
  if (!intelligence?.length) return strategy;

  const used = new Set<number>();

  const pickIntelForSlide = (slide: StoreSlidePlan): ScreenshotIntelligence | undefined => {
    const free = intelligence.filter((row) => !used.has(row.index));
    if (!free.length) return undefined;

    const beatMatches = free.filter((row) => row.recommendedSlideBeats?.includes(slide.asoBeat));
    const pool = beatMatches.length ? beatMatches : free;
    pool.sort((a, b) => ratingScore(a.rating) - ratingScore(b.rating));
    return pool[0];
  };

  const slides = strategy.slides.map((slide) => {
    if (slide.asoBeat === "download_cta" || slide.screenshotUsage === "none") {
      return { ...slide, screenshotIndex: null, screenshotUsage: "none" as const };
    }

    const intel = pickIntelForSlide(slide);
    if (!intel) return slide;

    used.add(intel.index);
    const { patch } = buildSlidePatchForScreenshot(strategy, slide, intel.index, appProfile);
    return { ...slide, ...patch };
  });

  return { ...strategy, slides };
}
