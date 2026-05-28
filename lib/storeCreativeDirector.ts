import { normalizeMockupPose } from "@/lib/mockupPose";
import { splitHeadlineParts } from "@/lib/asoTypography";
import type {
  AppProfile,
  BackgroundScene,
  BackgroundTreatment,
  SetMode,
  SlideLayoutStyle,
  StoreSlideBeat,
  StoreSlidePlan,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { normalizeSharedSlideNumbers } from "@/lib/syncBackgroundScenes";

export const DEFAULT_ACCENT_COLOR = "#2dd4bf";

const beatOrder: StoreSlideBeat[] = [
  "hook",
  "problem_outcome",
  "feature_benefit",
  "social_proof",
  "download_cta",
];

function getBeatForSlide(slideNumber: number): StoreSlideBeat {
  return beatOrder[Math.min(Math.max(slideNumber - 1, 0), beatOrder.length - 1)];
}

const beatRationaleFallback: Record<StoreSlideBeat, string> = {
  hook: "Slide 1 needs scroll-stopping abstract brand energy — no person.",
  problem_outcome: "Emotional connection via a relatable person in focus context.",
  feature_benefit: "Same photoshoot as slide 2 keeps the story cohesive.",
  social_proof: "Calmer environment-only scene signals trust without repeating the person shot.",
  download_cta: "Bold AI brand atmosphere for the download moment — Creative Director chooses treatment and reuse.",
};

const beatDefaults: Record<
  StoreSlideBeat,
  {
    treatment: BackgroundTreatment;
    layoutStyle: SlideLayoutStyle;
    showAppBranding: boolean;
  }
> = {
  hook: { treatment: "abstract_brand", layoutStyle: "hero_branded", showAppBranding: true },
  problem_outcome: { treatment: "lifestyle_with_person", layoutStyle: "lifestyle_focus", showAppBranding: true },
  feature_benefit: { treatment: "lifestyle_with_person", layoutStyle: "lifestyle_focus", showAppBranding: false },
  social_proof: { treatment: "lifestyle_environment", layoutStyle: "lifestyle_focus", showAppBranding: false },
  download_cta: { treatment: "cta_brand", layoutStyle: "cta_minimal", showAppBranding: true },
};

export function resolveBackgroundScene(strategy: StrategyBrief, slide: StoreSlidePlan): BackgroundScene | null {
  if (!slide.backgroundSceneId) {
    return null;
  }

  return strategy.backgroundScenes.find((scene) => scene.id === slide.backgroundSceneId) || null;
}

export function isSlideSolidBackground(
  setMode: SetMode,
  slideNumber: number,
  styleAnchorSlide = 1,
): boolean {
  if (setMode === "solid") return true;
  if (setMode === "hybrid") return slideNumber !== styleAnchorSlide;
  return false;
}

export function buildHybridBackgroundScenes(
  profile: AppProfile,
  brandColor: string,
  styleAnchorSlide = 1,
): BackgroundScene[] {
  const lifestyle = buildFallbackBackgroundScenes(profile);
  const anchorScene =
    lifestyle.find((scene) => scene.sharedBySlides.includes(styleAnchorSlide)) ?? lifestyle[0];
  const solidSlides = [1, 2, 3, 4, 5].filter((n) => n !== styleAnchorSlide);
  const solidBase = buildSolidBackgroundScene(profile, brandColor)[0];

  return [
    {
      ...anchorScene,
      id: "hybrid-hero-ai",
      label: `AI lifestyle (slide ${styleAnchorSlide})`,
      sharedBySlides: [styleAnchorSlide],
      reuseRationale: `Scroll-stopping AI hero background for slide ${styleAnchorSlide} only.`,
    },
    {
      ...solidBase,
      id: "solid-brand-set",
      label: `Solid ${brandColor} (slides ${solidSlides.join(", ")})`,
      sharedBySlides: solidSlides,
      reuseRationale: `Programmatic brand fill from your hex — not a preset palette. Slides ${solidSlides.join(", ")} share this color.`,
    },
  ];
}

export function buildSolidBackgroundScene(profile: AppProfile, brandColor: string): BackgroundScene[] {
  return [
    {
      id: "solid-brand-set",
      label: "Solid brand color",
      treatment: "abstract_brand",
      sceneDescription: `Solid brand fill ${brandColor} for ${profile.appName} — same color on every slide (no AI lifestyle scene).`,
      reuseRationale: "Solid set mode — one color, maximum swipe consistency (ASO skill style).",
      sharedBySlides: [1, 2, 3, 4, 5],
    },
  ];
}

export function normalizeHeadlineFields(slide: Partial<StoreSlidePlan>): {
  headline: string;
  headlineVerb: string;
  headlineDescriptor: string;
} {
  const headline = String(slide.headline || "").trim();
  const parts = splitHeadlineParts(headline, slide.headlineVerb, slide.headlineDescriptor);
  const fullHeadline = parts.descriptor ? `${parts.verb} ${parts.descriptor}` : parts.verb;
  return {
    headline: fullHeadline,
    headlineVerb: parts.verb,
    headlineDescriptor: parts.descriptor,
  };
}

export function buildFallbackBackgroundScenes(profile: AppProfile): BackgroundScene[] {
  return [
    {
      id: "hero-brand-world",
      label: "Neon brand hero",
      treatment: "abstract_brand",
      sceneDescription: `Dark cinematic space with glowing teal and blue neon arcs, soft particles, premium tech mood for ${profile.appName} — rich depth, NOT flat gray.`,
      reuseRationale: "Slide 1 only — scroll-stopping brand energy.",
      sharedBySlides: [1],
    },
    {
      id: "focus-lifestyle",
      label: "Deep work lifestyle",
      treatment: "lifestyle_with_person",
      sceneDescription:
        "Young professional at a calm desk with laptop, warm side light, shallow depth of field, focused mood — person visible from side or over-shoulder, no phone in hands. Moody navy room with teal rim light.",
      reuseRationale: "Slide 2 — emotional problem/outcome beat with its own photoshoot.",
      sharedBySlides: [2],
    },
    {
      id: "feature-environment",
      label: "Feature workspace",
      treatment: "lifestyle_environment",
      sceneDescription:
        "Organized desk with plants, notebook, soft morning window light, teal accent glow on props — NO people, detailed textures, cinematic depth.",
      reuseRationale: "Slide 3 — distinct feature-benefit environment (not reused from slide 2).",
      sharedBySlides: [3],
    },
    {
      id: "confidence-environment",
      label: "Calm proof scene",
      treatment: "lifestyle_environment",
      sceneDescription:
        "Serene study nook or morning routine corner — NO people, soft natural light, wood textures, subtle brand teal accent glow.",
      reuseRationale: "Slide 4 — calmer proof mood, unique from prior slides.",
      sharedBySlides: [4],
    },
    {
      id: "cta-brand-finale",
      label: "CTA brand finale",
      treatment: "cta_brand",
      sceneDescription: `Bold cinematic brand atmosphere for ${profile.appName} — deep navy-to-teal gradient depth, soft light rays, energy particles. NOT flat gray or empty studio.`,
      reuseRationale: "Slide 5 — unique CTA closing mood.",
      sharedBySlides: [5],
    },
  ];
}

function defaultSceneIdForSlide(slideNumber: number): string | null {
  if (slideNumber === 1) return "hero-brand-world";
  if (slideNumber === 2) return "focus-lifestyle";
  if (slideNumber === 3) return "feature-environment";
  if (slideNumber === 4) return "confidence-environment";
  if (slideNumber === 5) return "cta-brand-finale";
  return null;
}

/** Split AI scenes that share 3+ slides so each slide gets a distinct background. */
function expandOversharedScenes(scenes: BackgroundScene[]): BackgroundScene[] {
  const expanded: BackgroundScene[] = [];

  for (const scene of scenes) {
    const slides = [...new Set(scene.sharedBySlides)].sort((a, b) => a - b);
    if (slides.length <= 2) {
      expanded.push(scene);
      continue;
    }

    slides.forEach((slideNumber) => {
      expanded.push({
        ...scene,
        id: `${scene.id}-slide-${slideNumber}`,
        label: `${scene.label} (slide ${slideNumber})`,
        sharedBySlides: [slideNumber],
        sceneDescription: `${scene.sceneDescription} Unique variation for slide ${slideNumber} — distinct composition, same brand world.`,
        reuseRationale: `Slide ${slideNumber} gets its own AI background (auto-split from overshared scene).`,
      });
    });
  }

  return expanded.length ? expanded : scenes;
}

function defaultFeatureHighlights(profile: AppProfile, beat: StoreSlideBeat): string[] {
  if (beat !== "hook") return [];

  const category = profile.category.toLowerCase();
  if (category.includes("productiv") || category.includes("focus")) {
    return ["Ready Routines", "App Blocking", "AI Coach"];
  }

  return [];
}

export function normalizeBackgroundScenes(
  raw: Partial<BackgroundScene>[] | undefined,
  profile: AppProfile,
): BackgroundScene[] {
  const fallback = buildFallbackBackgroundScenes(profile);
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback;
  }

  const scenes = raw.slice(0, 8).map((scene, index) => {
    const fb = fallback[index] || fallback[fallback.length - 1];
    const treatment =
      scene.treatment === "lifestyle_with_person" ||
      scene.treatment === "lifestyle_environment" ||
      scene.treatment === "abstract_brand" ||
      scene.treatment === "cta_brand"
        ? scene.treatment
        : fb.treatment;

    const sharedBySlides = normalizeSharedSlideNumbers(scene.sharedBySlides);
    const fallbackShared = normalizeSharedSlideNumbers(fb.sharedBySlides);

    return {
      id: String(scene.id || fb.id).trim() || fb.id,
      label: String(scene.label || fb.label).trim(),
      treatment,
      sceneDescription: String(scene.sceneDescription || fb.sceneDescription).trim(),
      reuseRationale: String(scene.reuseRationale || fb.reuseRationale).trim(),
      sharedBySlides: sharedBySlides.length ? sharedBySlides : fallbackShared,
    };
  });

  return expandOversharedScenes(scenes.length ? scenes : fallback);
}

export function normalizeSlideCreativeFields(
  slide: Partial<StoreSlidePlan>,
  slideNumber: number,
  profile: AppProfile,
  scenes: BackgroundScene[],
): Pick<
  StoreSlidePlan,
  | "backgroundSceneId"
  | "backgroundTreatment"
  | "layoutStyle"
  | "headlineAccent"
  | "featureHighlights"
  | "showAppBranding"
  | "backgroundRationale"
> {
  const beat = getBeatForSlide(slideNumber);
  const defaults = beatDefaults[beat];

  let backgroundTreatment: BackgroundTreatment =
    slide.backgroundTreatment === "lifestyle_with_person" ||
    slide.backgroundTreatment === "lifestyle_environment" ||
    slide.backgroundTreatment === "abstract_brand" ||
    slide.backgroundTreatment === "cta_brand"
      ? slide.backgroundTreatment
      : String(slide.backgroundTreatment || "") === "programmatic_cta"
        ? "cta_brand"
        : defaults.treatment;

  let backgroundSceneId =
    typeof slide.backgroundSceneId === "string" ? slide.backgroundSceneId.trim() : defaultSceneIdForSlide(slideNumber);

  if (backgroundSceneId) {
    const exists = scenes.some((scene) => scene.id === backgroundSceneId);
    if (!exists) {
      backgroundSceneId = defaultSceneIdForSlide(slideNumber);
    }
  }

  const layoutStyle: SlideLayoutStyle =
    slide.layoutStyle === "hero_branded" ||
    slide.layoutStyle === "lifestyle_focus" ||
    slide.layoutStyle === "feature_pills" ||
    slide.layoutStyle === "cta_minimal"
      ? slide.layoutStyle
      : defaults.layoutStyle;

  const featureHighlights = Array.isArray(slide.featureHighlights)
    ? slide.featureHighlights.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
    : defaultFeatureHighlights(profile, beat);

  return {
    backgroundSceneId,
    backgroundTreatment,
    layoutStyle,
    headlineAccent: String(slide.headlineAccent || "").trim(),
    featureHighlights,
    showAppBranding: typeof slide.showAppBranding === "boolean" ? slide.showAppBranding : defaults.showAppBranding,
    backgroundRationale: String(slide.backgroundRationale || beatRationaleFallback[beat]).trim(),
  };
}

export function syncBackgroundSceneSlideMap(scenes: BackgroundScene[], slides: StoreSlidePlan[]): BackgroundScene[] {
  const slideSceneMap = new Map<number, string>();
  slides.forEach((slide) => {
    if (slide.backgroundSceneId) {
      slideSceneMap.set(slide.slideNumber, slide.backgroundSceneId);
    }
  });

  return scenes.map((scene) => {
    const fromSlides = slides
      .filter((slide) => slide.backgroundSceneId === scene.id)
      .map((slide) => slide.slideNumber);
    const merged = [...new Set([...scene.sharedBySlides, ...fromSlides])].sort((a, b) => a - b);
    return { ...scene, sharedBySlides: merged.length ? merged : scene.sharedBySlides };
  });
}

function normalizeSetMode(value: unknown): SetMode {
  if (value === "solid" || value === "hybrid" || value === "lifestyle") {
    return value;
  }
  return "lifestyle";
}

function resolveSceneIdForSlide(
  scenes: BackgroundScene[],
  slideNumber: number,
  fallback: string | null,
): string | null {
  const match = scenes.find((scene) => scene.sharedBySlides.includes(slideNumber));
  return match?.id ?? fallback;
}

export function applyCreativeDirectorDefaults(
  brief: StrategyBrief,
  profile: AppProfile,
): StrategyBrief {
  const setMode = normalizeSetMode(brief.setMode);
  const brandColor = brief.brandColor || brief.accentColor || DEFAULT_ACCENT_COLOR;
  const styleAnchorSlide = brief.styleAnchorSlide || 1;

  const backgroundScenes =
    setMode === "solid"
      ? buildSolidBackgroundScene(profile, brandColor)
      : setMode === "hybrid"
        ? buildHybridBackgroundScenes(profile, brandColor, styleAnchorSlide)
        : normalizeBackgroundScenes(
            brief.setMode === "solid" || brief.setMode === "hybrid" ? undefined : brief.backgroundScenes,
            profile,
          );

  const slides = brief.slides.map((slide, index) => {
    const slideNumber = index + 1;
    const creative = normalizeSlideCreativeFields(slide, slideNumber, profile, backgroundScenes);
    const headlines = normalizeHeadlineFields({ ...slide, ...creative });
    const useSolid = isSlideSolidBackground(setMode, slideNumber, styleAnchorSlide);
    const sceneId = useSolid
      ? "solid-brand-set"
      : setMode === "hybrid"
        ? slideNumber === styleAnchorSlide
          ? "hybrid-hero-ai"
          : "solid-brand-set"
        : resolveSceneIdForSlide(backgroundScenes, slideNumber, creative.backgroundSceneId);

    const solidBackdropNote = `Solid backdrop (${brandColor}) from your brand color — generated in code, not a stock palette.`;

    const mockupPose =
      slide.screenshotUsage === "none"
        ? undefined
        : normalizeMockupPose(slide.mockupPose, slideNumber);

    return {
      ...slide,
      slideNumber,
      ...creative,
      ...headlines,
      backgroundSceneId: sceneId,
      mockupPose,
      ...(useSolid
        ? {
            backgroundTreatment: "abstract_brand" as const,
            visualVariant: "Solid brand color",
            backgroundRationale: slide.backgroundRationale?.toLowerCase().includes("solid")
              ? slide.backgroundRationale
              : solidBackdropNote,
          }
        : {}),
    };
  });

  const syncedScenes = syncBackgroundSceneSlideMap(backgroundScenes, slides);

  return {
    ...brief,
    setMode,
    brandColor,
    accentColor: brief.accentColor || brandColor,
    styleAnchorSlide: brief.styleAnchorSlide || 1,
    screenshotAssessments: brief.screenshotAssessments || [],
    backgroundScenes: syncedScenes,
    slides,
  };
}

export function summarizeCreativePlan(strategy: StrategyBrief): string {
  const sceneLines = strategy.backgroundScenes.map(
    (scene) =>
      `• ${scene.label} (${scene.treatment}) → slides ${scene.sharedBySlides.join(", ")}: ${scene.reuseRationale}`,
  );

  const slideLines = strategy.slides.map(
    (slide) =>
      `Slide ${slide.slideNumber}: ${slide.backgroundTreatment}${slide.backgroundSceneId ? ` [${slide.backgroundSceneId}]` : ""} — ${slide.backgroundRationale}`,
  );

  return [...sceneLines, "", ...slideLines].join("\n");
}

export function countUniqueBackgroundGenerations(strategy: StrategyBrief): number {
  if (strategy.setMode === "solid") return 0;

  if (strategy.setMode === "hybrid") {
    return 1;
  }

  const sceneIds = new Set<string>();
  strategy.slides.forEach((slide) => {
    if (slide.backgroundSceneId && slide.backgroundSceneId !== "solid-brand-set") {
      sceneIds.add(slide.backgroundSceneId);
    }
  });
  return sceneIds.size;
}

export function describeBackgroundPlan(strategy: StrategyBrief): string {
  const anchor = strategy.styleAnchorSlide || 1;
  if (strategy.setMode === "solid") {
    return "1 shared color · no AI bg";
  }
  if (strategy.setMode === "hybrid") {
    return `1 AI (slide ${anchor}) + solid slides`;
  }
  return `${countUniqueBackgroundGenerations(strategy)} unique AI backgrounds`;
}
