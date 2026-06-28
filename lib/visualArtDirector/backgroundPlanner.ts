import type {
  BackgroundTreatment,
  ScreenshotColorProfile,
  SetMode,
  SlideLayoutStyle,
  StoreSlideBeat,
  StoreSlidePlan,
} from "@/lib/campaignTypes";
import { analyzeScreenSignals } from "@/lib/visualArtDirector/screenSignals";
import type { VisualBackgroundStyle } from "@/lib/visualArtDirector/types";
import { getSlideIntelligence } from "@/lib/visualArtDirector/types";
import type { ScreenshotIntelligence } from "@/lib/campaignTypes";

export type BackgroundPlan = {
  backgroundTreatment: BackgroundTreatment;
  backgroundStyle: VisualBackgroundStyle;
  setMode: SetMode;
  layoutStyle: SlideLayoutStyle;
  backgroundRationale: string;
  recommendations: Array<{ field: "background"; recommended: string; rationale: string; avoid?: string }>;
};

const BEAT_LAYOUT: Record<StoreSlideBeat, SlideLayoutStyle> = {
  hook: "hero_branded",
  problem_outcome: "lifestyle_focus",
  feature_benefit: "lifestyle_focus",
  social_proof: "lifestyle_focus",
  download_cta: "cta_minimal",
};

function pickBackgroundStyle(
  beat: StoreSlideBeat,
  uiTone: ScreenshotColorProfile["uiTone"] | "unknown",
  slideNumber: number,
  productFirst: boolean,
): VisualBackgroundStyle {
  if (beat === "download_cta") return "premium_dark_gradient";

  if (uiTone === "dark") {
    const darkUiBackgrounds: VisualBackgroundStyle[] = [
      "soft_light_gradient",
      "light_mist",
      "minimal_studio",
      "neutral_desk",
    ];
    return darkUiBackgrounds[(slideNumber - 1) % darkUiBackgrounds.length];
  }

  if (uiTone === "light") {
    return slideNumber === 1 ? "premium_dark_gradient" : "soft_light_gradient";
  }

  if (productFirst) return "minimal_studio";
  return beat === "hook" ? "subtle_lifestyle" : "soft_light_gradient";
}

function styleToTreatment(style: VisualBackgroundStyle, beat: StoreSlideBeat): BackgroundTreatment {
  if (beat === "download_cta") return "cta_brand";
  if (style === "subtle_lifestyle") return "lifestyle_environment";
  if (style === "neutral_desk") return "lifestyle_environment";
  return "abstract_brand";
}

function styleDescription(style: VisualBackgroundStyle, accentColor: string): string {
  switch (style) {
    case "soft_light_gradient":
      return "Soft light gradient — pale misty blue-gray to warm off-white. Calm, premium, high separation from dark UI.";
    case "light_mist":
      return "Light misty premium background — airy blue-lavender haze, minimal detail, NO people.";
    case "minimal_studio":
      return "Minimal studio plate — soft neutral gray gradient, subtle vignette, product-first. NO clutter.";
    case "neutral_desk":
      return "Neutral desk environment — blurred soft workspace, shallow depth, NO faces, NO phone in scene.";
    case "premium_dark_gradient":
      return "Premium dark gradient — deep charcoal to subtle brand accent glow at edges. Keep upper 40% clean for text.";
    case "subtle_lifestyle":
      return "Subtle lifestyle atmosphere — soft natural light, environment-only, person optional and small in frame.";
    case "abstract_glass":
      return "Abstract glass/card shapes — soft frosted panels, brand accent as highlight only.";
    case "solid_brand_accent":
    default:
      return `Brand accent ${accentColor} as subtle gradient wash — NOT flat neon fill. Keep mockup separation strong.`;
  }
}

export function planSlideBackground(
  slide: StoreSlidePlan,
  colorProfile: ScreenshotColorProfile | null | undefined,
  intelligence: ScreenshotIntelligence[] = [],
  productFirst: boolean,
  accentColor: string,
): BackgroundPlan {
  const intel = getSlideIntelligence(slide, intelligence);
  const signals = analyzeScreenSignals(intel);
  const uiTone = colorProfile?.uiTone ?? "mixed";
  const beat = slide.asoBeat;

  const backgroundStyle = pickBackgroundStyle(beat, uiTone, slide.slideNumber, productFirst);
  const backgroundTreatment = styleToTreatment(backgroundStyle, beat);
  const layoutStyle = BEAT_LAYOUT[beat];

  const useSolidSlides =
    beat !== "hook" &&
    (backgroundStyle === "soft_light_gradient" ||
      backgroundStyle === "light_mist" ||
      backgroundStyle === "minimal_studio");

  const setMode: SetMode =
    beat === "download_cta" || backgroundStyle === "subtle_lifestyle" || backgroundStyle === "premium_dark_gradient"
      ? "lifestyle"
      : useSolidSlides
        ? "hybrid"
        : "lifestyle";

  const sceneLine = styleDescription(backgroundStyle, accentColor);
  const backgroundRationale =
    uiTone === "dark"
      ? `Dark app UI → light background (${backgroundStyle}) for contrast and mockup separation.`
      : `Product-first ${beat} slide — ${backgroundStyle} supports readability without stealing focus.`;

  const recommendations: BackgroundPlan["recommendations"] = [
    {
      field: "background",
      recommended: backgroundStyle,
      rationale: sceneLine,
      avoid:
        uiTone === "dark"
          ? "Dark cinematic background — phone and UI merge together, unreadable at thumbnail size."
          : undefined,
    },
  ];

  if (signals.isRetake) {
    recommendations.push({
      field: "background",
      recommended: "minimal_studio",
      rationale: "Screenshot flagged retake — simplify background until screen content improves.",
    });
  }

  return {
    backgroundTreatment,
    backgroundStyle,
    setMode,
    layoutStyle,
    backgroundRationale,
    recommendations,
  };
}

export function resolveSetModeFromPlans(plans: BackgroundPlan[]): SetMode {
  const modes = new Set(plans.map((p) => p.setMode));
  if (modes.has("lifestyle") && !modes.has("solid")) return "lifestyle";
  if (modes.has("lifestyle") && modes.has("hybrid")) return "hybrid";
  if (modes.has("hybrid")) return "hybrid";
  return "lifestyle";
}

export function buildBackgroundSceneDescription(
  style: VisualBackgroundStyle,
  accentColor: string,
  brandColor: string,
): string {
  const base = styleDescription(style, accentColor);
  return `${base} Brand accent ${accentColor} as subtle highlight only — primary fill may use complementary neutral, NOT full ${brandColor} on every slide.`;
}
