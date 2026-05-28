import {
  STORE_SLIDE_COUNT,
  type AppProfile,
  type ScreenshotAssessment,
  type StoreSlideBeat,
  type StoreSlidePlan,
  type StrategyBrief,
} from "@/lib/campaignTypes";
import { mockupPoseForSlide } from "@/lib/mockupPose";
import { applyCreativeDirectorDefaults } from "@/lib/storeCreativeDirector";
import { formatCategoryPresetForPrompt } from "@/lib/categoryStylePresets";

export const storeSlideBeatMeta: Record<
  StoreSlideBeat,
  {
    label: string;
    slideNumber: number;
    role: StoreSlidePlan["role"];
    conversionGoal: string;
    copyGuidance: string;
    visualVariantHint: string;
    defaultScreenshotUsage: StoreSlidePlan["screenshotUsage"];
  }
> = {
  hook: {
    label: "Hook",
    slideNumber: 1,
    role: "hero",
    conversionGoal: "Stop the scroll — communicate the #1 outcome in under 5 words.",
    copyGuidance:
      "Lead with a benefit or transformation, not the app name alone. App name belongs in subheadline if needed.",
    visualVariantHint:
      "Editorial lifestyle photo — person at a focused desk, shallow depth of field, teal rim light, dark premium mood. Highest energy.",
    defaultScreenshotUsage: "hero_mockup",
  },
  problem_outcome: {
    label: "Problem → Outcome",
    slideNumber: 2,
    role: "feature",
    conversionGoal: "Make the user feel the pain, then show the relief your app delivers.",
    copyGuidance:
      "Headline = pain or desire. Subheadline = how the app solves it. Do not repeat slide 1 wording.",
    visualVariantHint:
      "Relatable lifestyle scene — evening workspace or calm study nook, warm side light, human context, no devices visible.",
    defaultScreenshotUsage: "feature_mockup",
  },
  feature_benefit: {
    label: "Feature Benefit",
    slideNumber: 3,
    role: "feature",
    conversionGoal: "Prove a core capability with a benefit-led headline tied to the screen shown.",
    copyGuidance:
      "Headline must describe the user benefit, never a UI label like 'Settings' or 'Dashboard'.",
    visualVariantHint:
      "Feature-context environment — same photoshoot as slide 1–2, e.g. deep-work desk, forest walk, or night routine with brand accent glow.",
    defaultScreenshotUsage: "feature_mockup",
  },
  social_proof: {
    label: "Depth / Proof",
    slideNumber: 4,
    role: "feature",
    conversionGoal: "Build trust — secondary benefit, use-case depth, or outcome reinforcement.",
    copyGuidance:
      "Headline = another distinct benefit or 'who it's for'. Avoid repeating slides 1–3. No fake ratings.",
    visualVariantHint:
      "Calmer confidence scene — morning routine, organized workspace, soft natural light, same brand world as prior slides.",
    defaultScreenshotUsage: "feature_mockup",
  },
  download_cta: {
    label: "Download CTA",
    slideNumber: 5,
    role: "cta",
    conversionGoal: "Remove friction — clear download action with urgency and brand recall.",
    copyGuidance:
      "Headline = action ('Start Free', 'Download Now'). Subheadline = low-friction promise. No feature lists.",
    visualVariantHint:
      "Brand-forward CTA plate — strong gradient from design system, minimal scene, maximum copy clarity.",
    defaultScreenshotUsage: "none",
  },
};

const beatOrder: StoreSlideBeat[] = [
  "hook",
  "problem_outcome",
  "feature_benefit",
  "social_proof",
  "download_cta",
];

export function getBeatForSlide(slideNumber: number): StoreSlideBeat {
  return beatOrder[Math.min(Math.max(slideNumber - 1, 0), STORE_SLIDE_COUNT - 1)];
}

export function buildAsoStrategyPromptBlock(profile: AppProfile, screenshotCount: number): string {
  const beatSummary = beatOrder
    .map((beat) => `${storeSlideBeatMeta[beat].slideNumber}=${beat}`)
    .join(", ");

  return [
    "Create ASO 5-slide App Store set: one conversion story (Hook→Problem→Feature→Proof→Download), not 5 clones or 5 unrelated ads.",
    "",
    formatCategoryPresetForPrompt(profile),
    "",
    `App: ${profile.appName} | ${profile.category}`,
    `Description: ${profile.description}`,
    `Audience: ${profile.targetAudience || "Mobile app users"}`,
    `Screenshots: ${screenshotCount} (index 0-based; use each once when possible; slide 5 usually no screenshot)`,
    "",
    `Beats: ${beatSummary}. Each slide: unique headline, shared designSystem, deliberate background plan.`,
    "",
    "JSON keys: positioning, primaryMessage, targetAudience, narrativeArc, designSystem, visualTheme, accentColor, brandColor, setMode (lifestyle | solid | hybrid), styleAnchorSlide, screenshotAssessments[], backgroundScenes[], slides[5].",
    "screenshotAssessments[]: per uploaded image index — rating (great | usable | retake), issues[], retakeGuidance, description.",
    "backgroundScenes[] (4–5 unique scenes for slides 1–5): id, label, treatment, sceneDescription, reuseRationale, sharedBySlides[].",
    "Each slide: slideNumber, role, asoBeat, conversionGoal, headline, headlineVerb (ACTION VERB uppercase), headlineDescriptor (benefit words uppercase), subheadline, screenshotIndex, screenshotUsage, screenshotRationale, screenshotRating, screenshotIssues[], retakeGuidance, visualStyle, visualVariant, backgroundSceneId, backgroundTreatment, layoutStyle, headlineAccent, featureHighlights[], showAppBranding, backgroundRationale, mockupPose { orientation: upright|tilt_left|tilt_right, scale: compact|standard|hero, placement: center|left|right }, breakoutPanelDescription (optional).",
    "mockupPose: Slides 1–4 MUST use tilt_left or tilt_right (3D showcase, never upright). Slide 1 = tilt_right + hero + placement right (SWAY hero). Vary tilt/placement on 2–4; opposite side of frame stays open for lifestyle/bokeh.",
    "setMode: DEFAULT lifestyle (AI cinematic backgrounds). Use solid ONLY if user needs flat brand-color slides. Use hybrid ONLY if user wants 1 AI hero + solid rest.",
    "setMode solid: brandColor hex for ALL slides (programmatic fill). setMode lifestyle: 4–5 AI scenes. setMode hybrid: slide styleAnchorSlide gets AI hero; other slides use brandColor solid fill.",
    "",
    "CREATIVE DIRECTOR RULES:",
    "- setMode MUST be lifestyle unless there is a strong reason for solid/hybrid.",
    "- Prefer a UNIQUE background scene per slide (5 scenes). Share a scene on at most 2 adjacent slides only when the same photoshoot is essential.",
    "- sceneDescription must describe a rich cinematic environment with depth — NEVER plain gray, white void, or empty gradient.",
    "- lifestyle_with_person: include one person (side/over-shoulder) — best for emotional connection slides.",
    "- lifestyle_environment: NO people — desk, nature, interior atmosphere.",
    "- abstract_brand: neon arcs, particles, dark premium tech mood — ideal for slide 1 hero ONLY.",
    "- download_cta slide: choose backgroundTreatment deliberately (cta_brand, abstract_brand, or reuse an earlier scene). Assign backgroundSceneId — may share slide 1 brand world or use a unique CTA scene.",
    "- Reuse backgrounds when slides tell one story (e.g. slides 2–3 same photoshoot). Use a NEW scene when mood must shift (e.g. slide 4 calmer proof).",
    "- backgroundRationale: one sentence explaining WHY you chose this treatment and reuse plan.",
    "- headlineAccent: pick 1–3 words from headline for gradient highlight.",
    "- featureHighlights: hook slide only — 2–3 short value props (1–2 words each, e.g. App Blocking, AI Coach, Focus Timer).",
    "Match screens to messages from uploaded images.",
  ].join("\n");
}

export function buildFallbackStoreStrategy(profile: AppProfile, screenshotCount: number): StrategyBrief {
  const shortDesc = profile.description.trim();
  const audience = profile.targetAudience || "busy mobile users";

  const slideTemplates: Array<{
    beat: StoreSlideBeat;
    headline: string;
    subheadline: string;
    screenshotRationale: string;
    visualVariant: string;
  }> = [
    {
      beat: "hook",
      headline: shortDesc.length > 42 ? `${profile.appName} — focus, simplified` : shortDesc.split(".")[0] || profile.appName,
      subheadline: `The ${profile.category.toLowerCase()} app built for ${audience.toLowerCase()}.`,
      screenshotRationale: "Home or hero screen — instantly communicates what the app is.",
      visualVariant: "Dark cinematic space with glowing teal and blue neon arcs, soft particles, premium tech hero mood.",
    },
    {
      beat: "problem_outcome",
      headline: "Less noise. More done.",
      subheadline: `${profile.appName} turns daily chaos into a clear next step.`,
      screenshotRationale: "Core workflow screen that shows the main action loop.",
      visualVariant: "Relatable evening workspace — warm side light, calm human context, shallow depth of field.",
    },
    {
      beat: "feature_benefit",
      headline: "Your edge, built in",
      subheadline: "A standout capability that saves time from the first session.",
      screenshotRationale: "Feature screen that maps to a specific user benefit.",
      visualVariant: "Deep-work environment matching the feature — desk with soft teal glow or serene nature backdrop.",
    },
    {
      beat: "social_proof",
      headline: `Made for ${audience.split(" ")[0] || "you"}`,
      subheadline: "Designed for real routines — quick to start, easy to stick with.",
      screenshotRationale: "Secondary screen showing depth, stats, or personalization.",
      visualVariant: "Calm morning routine scene — organized desk, soft natural light, confidence-building mood.",
    },
    {
      beat: "download_cta",
      headline: "Download free",
      subheadline: `Start with ${profile.appName} today — no setup friction.`,
      screenshotRationale: "CTA slide — typography and brand colors drive the install action.",
      visualVariant: "Bold brand gradient CTA plate with minimal environmental detail.",
    },
  ];

  const slides = slideTemplates.map((template, index) => {
    const meta = storeSlideBeatMeta[template.beat];
    const usesScreenshot = meta.defaultScreenshotUsage !== "none" && screenshotCount > 0;

    return {
      slideNumber: index + 1,
      role: meta.role,
      asoBeat: template.beat,
      conversionGoal: meta.conversionGoal,
      headline: template.headline,
      subheadline: template.subheadline,
      screenshotIndex: usesScreenshot ? Math.min(index, screenshotCount - 1) : null,
      screenshotUsage: usesScreenshot ? meta.defaultScreenshotUsage : "none",
      screenshotRationale: template.screenshotRationale,
      visualStyle: `${meta.copyGuidance} ${meta.visualVariantHint}`,
      visualVariant: template.visualVariant,
      mockupPose: usesScreenshot ? mockupPoseForSlide(index + 1) : undefined,
    } as StoreSlidePlan;
  });

  return applyCreativeDirectorDefaults(
    {
      positioning: `${profile.appName} helps ${audience} achieve outcomes faster through ${shortDesc || profile.category.toLowerCase()}.`,
      primaryMessage: shortDesc || `${profile.appName} delivers a premium mobile experience for ${audience}.`,
      targetAudience: audience,
      narrativeArc: `From first-impression hook to download CTA — why ${profile.appName} wins for ${audience}.`,
      designSystem:
        "Dark navy base, teal accent glow, bold white headlines, large centered phone mockup, consistent top text block — same brand world on slides 1–4.",
      visualTheme: "Premium App Store lifestyle photography — cinematic lighting, shallow DOF, cohesive dark mood with teal accents.",
      accentColor: "#2dd4bf",
      brandColor: "#2dd4bf",
      setMode: "lifestyle",
      styleAnchorSlide: 1,
      screenshotAssessments: [],
      backgroundScenes: [],
      slides: assignUniqueScreenshots(slides, screenshotCount, []),
    },
    profile,
  );
}

function screenshotPriority(rating?: StoreSlidePlan["screenshotRating"]): number {
  if (rating === "great") return 0;
  if (rating === "usable") return 1;
  if (rating === "retake") return 2;
  return 1;
}

export function assignUniqueScreenshots(
  slides: StoreSlidePlan[],
  screenshotCount: number,
  assessments: ScreenshotAssessment[] = [],
): StoreSlidePlan[] {
  if (screenshotCount === 0) {
    return slides.map((slide) => ({
      ...slide,
      screenshotIndex: null,
      screenshotUsage: "none",
    }));
  }

  const ratingByIndex = new Map(assessments.map((a) => [a.index, a.rating]));
  const used = new Set<number>();

  const pickBestIndex = (preferred: number | null): number => {
    const free = Array.from({ length: screenshotCount }, (_, i) => i).filter((i) => !used.has(i));
    const sorted = free.sort(
      (a, b) =>
        screenshotPriority(ratingByIndex.get(a)) - screenshotPriority(ratingByIndex.get(b)),
    );

    if (preferred !== null && !used.has(preferred)) {
      const preferredRating = ratingByIndex.get(preferred);
      if (screenshotPriority(preferredRating) < 2) {
        return preferred;
      }
    }

    return sorted[0] ?? 0;
  };

  return slides.map((slide) => {
    if (slide.screenshotUsage === "none") {
      return { ...slide, screenshotIndex: null };
    }

    let index = slide.screenshotIndex ?? 0;
    index = Math.min(Math.max(index, 0), screenshotCount - 1);

    const indexRating = ratingByIndex.get(index);
    if (used.has(index) || screenshotPriority(indexRating) >= 2 || slide.screenshotRating === "retake") {
      index = pickBestIndex(used.has(index) ? null : index);
    }

    used.add(index);
    const assessment = assessments.find((a) => a.index === index);
    return {
      ...slide,
      screenshotIndex: index,
      screenshotRating: assessment?.rating ?? slide.screenshotRating,
      screenshotIssues: assessment?.issues ?? slide.screenshotIssues,
      retakeGuidance: assessment?.retakeGuidance ?? slide.retakeGuidance,
    };
  });
}

export function normalizeStoreSlideBeat(value: unknown, slideNumber: number): StoreSlideBeat {
  const expected = getBeatForSlide(slideNumber);
  const beats: StoreSlideBeat[] = beatOrder;
  if (typeof value === "string" && beats.includes(value as StoreSlideBeat)) {
    return value as StoreSlideBeat;
  }
  return expected;
}
