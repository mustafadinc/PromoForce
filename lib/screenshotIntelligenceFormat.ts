import type {
  AppProfile,
  ScreenshotAssessment,
  ScreenshotIntelligence,
  ScreenshotQualityRating,
  StoreSlideBeat,
} from "@/lib/campaignTypes";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

const beatValues: StoreSlideBeat[] = [
  "hook",
  "problem_outcome",
  "feature_benefit",
  "social_proof",
  "download_cta",
];

export function intelligenceToAssessment(intel: ScreenshotIntelligence): ScreenshotAssessment {
  return {
    index: intel.index,
    rating: intel.rating,
    issues: intel.issues,
    retakeGuidance: intel.retakeGuidance,
    description: intel.description,
  };
}

export function assessmentsFromIntelligence(intelligence: ScreenshotIntelligence[]): ScreenshotAssessment[] {
  return intelligence.map(intelligenceToAssessment);
}

export function formatScreenshotIntelligenceForPrompt(
  profile: AppProfile,
  intelligence: ScreenshotIntelligence[],
): string {
  if (!intelligence.length) return "";

  const blocks = intelligence.map((intel) => {
    const beats =
      intel.recommendedSlideBeats?.map((b) => storeSlideBeatMeta[b].label).join(", ") || "—";
    return [
      `Screen ${intel.index + 1} (index ${intel.index}):`,
      `  Quality: ${intel.rating}${intel.issues.length ? ` — issues: ${intel.issues.join("; ")}` : ""}`,
      `  What’s on screen: ${intel.description}`,
      intel.detectedFeatures.length ? `  Features: ${intel.detectedFeatures.join(", ")}` : null,
      intel.uiElements.length ? `  UI elements: ${intel.uiElements.join(", ")}` : null,
      intel.primaryUserAction ? `  Primary user action: ${intel.primaryUserAction}` : null,
      intel.screenType ? `  Screen type: ${intel.screenType}` : null,
      intel.suggestedHeadlines.length
        ? `  Suggested headlines: ${intel.suggestedHeadlines.slice(0, 3).join(" | ")}`
        : null,
      intel.suggestedBenefits.length ? `  Benefits: ${intel.suggestedBenefits.slice(0, 3).join(", ")}` : null,
      intel.suggestedSocialHooks.length
        ? `  Social hooks: ${intel.suggestedSocialHooks.slice(0, 2).join(" | ")}`
        : null,
      intel.tags.length ? `  Tags: ${intel.tags.join(", ")}` : null,
      `  Best ASO beats: ${beats}`,
      intel.retakeGuidance ? `  Retake guidance: ${intel.retakeGuidance}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "SCREENSHOT INTELLIGENCE (pre-analyzed — treat as ground truth for screenshot-to-slide mapping):",
    `App context: ${profile.appName} (${profile.category}) — ${profile.description.slice(0, 200)}`,
    "",
    ...blocks,
    "",
    "Use this analysis to assign each screenshot to the slide/post where it best proves the message.",
    "Headlines you write MUST reflect the features and benefits detected on the assigned screenshot.",
    "Do not invent features that are not visible on the assigned screen.",
  ].join("\n");
}

export function pickReelSegmentLabels(
  intelligence: ScreenshotIntelligence[],
  fallbackHeadline: string,
  maxSegments = 4,
): string[] {
  if (!intelligence.length) return [fallbackHeadline];

  return intelligence.slice(0, maxSegments).map((intel) => {
    const hook = intel.suggestedSocialHooks[0];
    const headline = intel.suggestedHeadlines[0];
    const feature = intel.detectedFeatures[0];
    return hook || headline || feature || intel.description.slice(0, 48) || fallbackHeadline;
  });
}

export function normalizeScreenshotIntelligence(
  raw: unknown,
  screenshotCount: number,
): ScreenshotIntelligence[] {
  if (!Array.isArray(raw)) return [];

  const out: ScreenshotIntelligence[] = [];

  for (const item of raw) {
    const row = item as Partial<ScreenshotIntelligence>;
    const index = typeof row.index === "number" ? row.index : -1;
    if (index < 0 || index >= screenshotCount) continue;

    const rating: ScreenshotQualityRating =
      row.rating === "great" || row.rating === "usable" || row.rating === "retake" ? row.rating : "usable";

    const recommendedSlideBeats = Array.isArray(row.recommendedSlideBeats)
      ? row.recommendedSlideBeats.filter((b): b is StoreSlideBeat => beatValues.includes(b as StoreSlideBeat))
      : undefined;

    out.push({
      index,
      rating,
      issues: Array.isArray(row.issues) ? row.issues.map(String).filter(Boolean) : [],
      retakeGuidance: row.retakeGuidance ? String(row.retakeGuidance) : undefined,
      description: String(row.description || "App screen").trim(),
      detectedFeatures: Array.isArray(row.detectedFeatures)
        ? row.detectedFeatures.map(String).filter(Boolean)
        : [],
      uiElements: Array.isArray(row.uiElements) ? row.uiElements.map(String).filter(Boolean) : [],
      tags: Array.isArray(row.tags) ? row.tags.map(String).filter(Boolean) : [],
      suggestedHeadlines: Array.isArray(row.suggestedHeadlines)
        ? row.suggestedHeadlines.map(String).filter(Boolean)
        : [],
      suggestedBenefits: Array.isArray(row.suggestedBenefits)
        ? row.suggestedBenefits.map(String).filter(Boolean)
        : [],
      suggestedSocialHooks: Array.isArray(row.suggestedSocialHooks)
        ? row.suggestedSocialHooks.map(String).filter(Boolean)
        : [],
      recommendedSlideBeats,
      primaryUserAction: row.primaryUserAction ? String(row.primaryUserAction) : undefined,
      screenType: row.screenType as ScreenshotIntelligence["screenType"],
    });
  }

  return out.sort((a, b) => a.index - b.index);
}

export function attachScreenshotIntelligence<T extends { screenshotIntelligence?: ScreenshotIntelligence[] }>(
  brief: T,
  intelligence: ScreenshotIntelligence[],
): T {
  if (!intelligence.length) return brief;

  if ("screenshotAssessments" in brief) {
    return {
      ...brief,
      screenshotIntelligence: intelligence,
      screenshotAssessments: assessmentsFromIntelligence(intelligence),
    } as T;
  }

  return {
    ...brief,
    screenshotIntelligence: intelligence,
  };
}
