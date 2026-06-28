import type { ScreenshotIntelligence } from "@/lib/campaignTypes";

export type ScreenVisualSignals = {
  /** UI needs maximum readability (analytics, settings, forms). */
  needsDetailReadability: boolean;
  /** Screen is visually simple (blocked state, timer, status). */
  isVisualHero: boolean;
  /** Small text density inferred from screen type + elements. */
  hasSmallText: boolean;
  /** Screen rated poorly for marketing use. */
  isRetake: boolean;
  screenType: ScreenshotIntelligence["screenType"];
};

const DETAIL_SCREEN_TYPES = new Set([
  "analytics",
  "settings",
  "feature_detail",
  "paywall",
]);

const DETAIL_UI_KEYWORDS = [
  "chart",
  "graph",
  "table",
  "list",
  "form",
  "settings",
  "dashboard",
  "stat",
  "analytics",
  "planner",
  "calendar",
  "grid",
];

const VISUAL_UI_KEYWORDS = [
  "blocked",
  "timer",
  "countdown",
  "status",
  "hero",
  "splash",
  "welcome",
  "card",
];

export function analyzeScreenSignals(intelligence: ScreenshotIntelligence | null): ScreenVisualSignals {
  if (!intelligence) {
    return {
      needsDetailReadability: false,
      isVisualHero: true,
      hasSmallText: false,
      isRetake: false,
      screenType: "other",
    };
  }

  const blob = [
    intelligence.description,
    ...intelligence.uiElements,
    ...intelligence.detectedFeatures,
  ]
    .join(" ")
    .toLowerCase();

  const screenType = intelligence.screenType ?? "other";
  const hasSmallText =
    DETAIL_SCREEN_TYPES.has(screenType) ||
    DETAIL_UI_KEYWORDS.some((kw) => blob.includes(kw));
  const isVisualHero =
    !hasSmallText &&
    (screenType === "home" ||
      screenType === "onboarding" ||
      VISUAL_UI_KEYWORDS.some((kw) => blob.includes(kw)));

  return {
    needsDetailReadability: hasSmallText,
    isVisualHero,
    hasSmallText,
    isRetake: intelligence.rating === "retake",
    screenType,
  };
}
