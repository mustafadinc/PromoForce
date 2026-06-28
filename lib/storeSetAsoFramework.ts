import {
  STORE_SLIDE_COUNT,
  type AppProfile,
  type ScreenshotAssessment,
  type StoreSlideBeat,
  type StoreSlidePlan,
  type StrategyBrief,
} from "@/lib/campaignTypes";
import { mockupPoseForSlide } from "@/lib/mockupPose";
import { mockupAssetForSlide } from "@/lib/assetMockup";
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
    conversionGoal: "Stop the scroll — #1 outcome in 3–6 words. ~89% of users never scroll past the first frames.",
    copyGuidance:
      "Name the pain or desire (question format OK). NO download/start/CTA verbs. Do NOT use the same VERB+DESCRIPTOR template as other slides.",
    visualVariantHint:
      "Editorial lifestyle photo — person at a focused desk, shallow depth of field, teal rim light, dark premium mood. Highest energy.",
    defaultScreenshotUsage: "hero_mockup",
  },
  problem_outcome: {
    label: "Problem → Outcome",
    slideNumber: 2,
    role: "feature",
    conversionGoal: "Problem-first storyboard: name the pain, then the relief. Front-load value in slides 1–3.",
    copyGuidance:
      "Headline = pain or desire (3–6 words). Subheadline = how the app solves it. Must connect to slide 1 hook — do not repeat slide 1 headline.",
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
    conversionGoal: "Build trust — social proof beat. Set showSocialProof true when proof assets exist.",
    copyGuidance:
      "Headline = trust/outcome benefit (3–6 words). Distinct keyword theme. Avoid fake ratings in copy — proof renders separately.",
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
      "Headline = action ('Start Free', 'Download Now'). Subheadline = recap top 3 benefits from slides 1–4 + low-friction promise. Reference primaryMessage.",
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

export function getBeatForSlide(slideNumber: number, slideCount: number = 5): StoreSlideBeat {
  if (slideNumber <= 1) return "hook";
  if (slideNumber >= slideCount) return "download_cta";
  if (slideNumber === 2) return "problem_outcome";
  return (slideNumber % 2 === 1) ? "feature_benefit" : "social_proof";
}

export function buildAsoStrategyPromptBlock(profile: AppProfile, screenshotCount: number): string {
  const slideCount = profile.slideCount ?? 5;
  const beatSummary = Array.from({ length: slideCount }, (_, i) => {
    const slideNumber = i + 1;
    const beat = getBeatForSlide(slideNumber, slideCount);
    return `${slideNumber}=${beat}`;
  }).join(", ");

  const keywordLine = profile.keywords
    ? `App Store keywords to distribute (one theme per slide, embed in headline): ${profile.keywords}`
    : "Infer high-intent App Store keyword themes from the app category and screenshots.";
  const metadataLine = [
    profile.appTitle ? `Listing title: ${profile.appTitle}` : "",
    profile.appSubtitle ? `Subtitle: ${profile.appSubtitle}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    `Create ASO ${slideCount}-slide App Store set using ButterKit storyboard principles: problem-first narrative, one focus per slide, front-load the 3 strongest benefits (most users never scroll past slide 3).`,
    "",
    formatCategoryPresetForPrompt(profile),
    "",
    `App: ${profile.appName} | ${profile.category}`,
    `Description: ${profile.description}`,
    `Audience: ${profile.targetAudience || "Mobile app users"}`,
    metadataLine,
    keywordLine,
    `Screenshots: ${screenshotCount} (index 0-based; use each once when possible; slide ${slideCount} usually no screenshot)`,
    "",
    `Beats: ${beatSummary}. Each slide: unique native headline, shared designSystem, deliberate background plan.`,
    "",
    "CAPTION RULES (OCR-indexed by Apple — critical):",
    "- ONE dominant caption per slide: 3–6 words (max 8). Lead with verb or number.",
    "- Ban marketing adverbs: easily, smoothly, simply, magically.",
    "- Assign keywordTheme per slide — embed that phrase in the headline verbatim.",
    "- Hook slide: omit heavy subheadline; other slides may use a short supporting subheadline.",
    "- Do NOT use the same VERB+DESCRIPTOR headline pattern on every slide — vary structure (question, outcome, action).",
    "",
    "NARRATIVE THREAD (mandatory):",
    "- Slide 1 hook: pain or desire ONLY — never 'Start', 'Download', 'Get started', or CTA language.",
    "- Slide 2 problem_outcome: names the pain from slide 1 and introduces relief — must feel like the next sentence in the story.",
    `- Slide ${slideCount} download_cta: summarizes benefits from slides 1–${slideCount - 1} + clear install urgency aligned with primaryMessage.`,
    "",
    `JSON keys: positioning, primaryMessage, targetAudience, narrativeArc, designSystem, visualTheme, accentColor, brandColor, setMode (lifestyle | solid | hybrid), styleAnchorSlide, screenshotAssessments[], backgroundScenes[], slides[${slideCount}].`,
    "screenshotAssessments[]: per uploaded image index — rating (great | usable | retake), issues[], retakeGuidance, description.",
    `backgroundScenes[] (unique scenes for slides 1–${slideCount}): id, label, treatment, sceneDescription, reuseRationale, sharedBySlides[].`,
    "sceneDescription MUST place people/focal subjects on the OPPOSITE side from mockupPose placement (person left when device right).",
    "Each slide: slideNumber, role, asoBeat, conversionGoal, headline, headlineVerb, headlineDescriptor, subheadline, keywordTheme, screenshotIndex, screenshotUsage, screenshotRationale, screenshotRating, screenshotIssues[], retakeGuidance, visualStyle, visualVariant, backgroundSceneId, backgroundTreatment, layoutStyle, headlineAccent, featureHighlights[], showSocialProof, showAppBranding, backgroundRationale, mockupPose { orientation: upright|showcase_upright|tilt_left|tilt_right, scale: compact|standard|hero, placement: auto|center|left|right }, breakoutPanelDescription (optional).",
    `mockupPose: Slides 1–${slideCount - 1} should usually use tilt_left or tilt_right. Use showcase_upright when a straight premium 3D device is better than a yawed angle. Slide 1 = tilt_right + hero + auto/right.`,
    "setMode: DEFAULT lifestyle (AI cinematic backgrounds). Use solid ONLY if user needs flat brand-color slides. Use hybrid ONLY if user wants 1 AI hero + solid rest.",
    `setMode solid: brandColor hex for ALL slides (programmatic fill). setMode lifestyle: ${slideCount} AI scenes. setMode hybrid: slide styleAnchorSlide gets AI hero; other slides use brandColor solid fill.`,
    "",
    "CREATIVE DIRECTOR RULES:",
    "- setMode MUST be lifestyle unless there is a strong reason for solid/hybrid.",
    `- Prefer a UNIQUE background scene per slide (${slideCount} scenes). Share a scene on at most 2 adjacent slides only when the same photoshoot is essential.`,
    "- sceneDescription must describe a rich cinematic environment with depth — NEVER plain gray, white void, or empty gradient.",
    "- lifestyle_with_person: include one person (side/over-shoulder) — best for hook and emotional slides.",
    "- lifestyle_environment: NO people — desk, nature, interior atmosphere.",
    "- abstract_brand: reserved for CTA slide or hybrid accent ONLY — never default for hook.",
    "- download_cta slide: choose backgroundTreatment deliberately (cta_brand, abstract_brand, or reuse an earlier scene). Assign backgroundSceneId — may share slide 1 brand world or use a unique CTA scene.",
    "- Reuse backgrounds when slides tell one story (e.g. slides 2–3 same photoshoot). Use a NEW scene when mood must shift (e.g. slide 4 calmer proof).",
    "- backgroundRationale: one sentence explaining WHY you chose this treatment and reuse plan.",
    "- headlineAccent: pick 1–3 words from headline for gradient highlight.",
    "- featureHighlights: hook slide ONLY — 2–3 short value props in the strategy locale language (1–2 words each).",
    "Match screens to messages from uploaded images.",
  ].join("\n");
}

export function buildFallbackStoreStrategy(profile: AppProfile, screenshotCount: number): StrategyBrief {
  const shortDesc = profile.description.trim();
  const audience = profile.targetAudience || "busy mobile users";
  const slideCount = profile.slideCount ?? 5;

  const hookTemplate = {
    beat: "hook" as const,
    headline: "Distracted all day?",
    subheadline: `${profile.appName} helps ${audience.toLowerCase()} reclaim focus.`,
    screenshotRationale: "Home or hero screen — instantly communicates what the app is.",
    visualVariant:
      "Editorial lifestyle photo — person at a focused desk, shallow depth of field, warm side light, premium commercial mood.",
  };

  const ctaTemplate = {
    beat: "download_cta" as const,
    headline: "Start focusing free",
    subheadline: `Join ${audience.toLowerCase()} using ${profile.appName} — download today.`,
    screenshotRationale: "CTA slide — typography and brand colors drive the install action.",
    visualVariant: "Bold brand gradient CTA plate with minimal environmental detail.",
  };

  const middleTemplates = [
    {
      beat: "problem_outcome" as const,
      headline: "Less noise. More done.",
      subheadline: `${profile.appName} turns daily chaos into a clear next step.`,
      screenshotRationale: "Core workflow screen that shows the main action loop.",
      visualVariant: "Relatable evening workspace — warm side light, calm human context, shallow depth of field.",
    },
    {
      beat: "feature_benefit" as const,
      headline: "Track what matters",
      subheadline: "See patterns and progress from your first week.",
      screenshotRationale: "Feature screen that maps to a specific user benefit.",
      visualVariant: "Deep-work environment — desk with soft natural light or serene nature backdrop.",
    },
    {
      beat: "social_proof" as const,
      headline: `Built for ${audience.split(" ")[0] || "you"}`,
      subheadline: "Designed for real routines — quick to start, easy to stick with.",
      screenshotRationale: "Secondary screen showing depth, stats, or personalization.",
      visualVariant: "Calm morning routine scene — organized desk, soft natural light, confidence-building mood.",
    },
    {
      beat: "feature_benefit" as const,
      headline: "Achieve your goals",
      subheadline: "Stay consistent with smart reminders and visual milestones.",
      screenshotRationale: "Goal tracking or dashboard screen showing progress details.",
      visualVariant: "Cinematic study space — clean desk, focused task light, modern aesthetic.",
    },
    {
      beat: "social_proof" as const,
      headline: "Highly rated by users",
      subheadline: "Join thousands of active users who changed their routine.",
      screenshotRationale: "User profile, rating, or testimonial layout screen.",
      visualVariant: "Serene living room with soft lighting, premium lifestyle photo.",
    },
    {
      beat: "feature_benefit" as const,
      headline: "Tailored to you",
      subheadline: "Customize themes, layouts, and widgets to fit your day.",
      screenshotRationale: "Settings, customization, or profile interface screen.",
      visualVariant: "Cozy home office nook with natural plants and warm ambient lighting.",
    },
    {
      beat: "social_proof" as const,
      headline: "Trusted worldwide",
      subheadline: "Secure, reliable, and designed with privacy in mind.",
      screenshotRationale: "Security, settings, or statistics summary screen.",
      visualVariant: "Bright modern architectural workspace with high windows and natural light.",
    },
    {
      beat: "feature_benefit" as const,
      headline: "All-in-one workspace",
      subheadline: "Everything you need to succeed, in one place.",
      screenshotRationale: "Feature overview or dashboard screen.",
      visualVariant: "Minimalist desktop setup with clean keyboard and warm accent highlights.",
    },
  ];

  const slides = Array.from({ length: slideCount }, (_, index) => {
    const slideNumber = index + 1;
    let template: {
      beat: StoreSlideBeat;
      headline: string;
      subheadline: string;
      screenshotRationale: string;
      visualVariant: string;
    } = hookTemplate;

    if (slideNumber === 1) {
      template = hookTemplate;
    } else if (slideNumber === slideCount && slideCount > 1) {
      template = ctaTemplate;
    } else {
      template = middleTemplates[(slideNumber - 2) % middleTemplates.length]!;
    }

    const meta = storeSlideBeatMeta[template.beat];
    const usesScreenshot = meta.defaultScreenshotUsage !== "none" && screenshotCount > 0;

    return {
      slideNumber,
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
      mockupPose: usesScreenshot ? mockupPoseForSlide(slideNumber) : undefined,
      mockupAssetId: usesScreenshot ? mockupAssetForSlide(slideNumber) : undefined,
    } as StoreSlidePlan;
  });

  return applyCreativeDirectorDefaults(
    {
      positioning: `${profile.appName} helps ${audience} achieve outcomes faster through ${shortDesc || profile.category.toLowerCase()}.`,
      primaryMessage: shortDesc || `${profile.appName} delivers a premium mobile experience for ${audience}.`,
      targetAudience: audience,
      narrativeArc: `Pain (slide 1) → relief (slide 2) → proof (slides 3–${slideCount - 1}) → download (slide ${slideCount}) — why ${profile.appName} wins for ${audience}.`,
      designSystem:
        `Dark premium base, teal accent, bold white headlines, lifestyle photography on slides 1–${slideCount - 1} — cohesive brand world.`,
      visualTheme: "Premium App Store lifestyle photography — cinematic lighting, shallow DOF, real environments, not neon abstract.",
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

export function normalizeStoreSlideBeat(_value: unknown, slideNumber: number): StoreSlideBeat {
  return getBeatForSlide(slideNumber);
}
