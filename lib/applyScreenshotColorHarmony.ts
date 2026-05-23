import type {
  AutopilotStrategyBrief,
  ScreenshotColorProfile,
  SocialStrategyBrief,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { buildScreenshotHarmonyGuidance } from "@/lib/extractScreenshotColorProfile";

function appendUniqueTheme(existing: string, addition: string) {
  const normalized = existing.toLowerCase();
  if (normalized.includes(addition.slice(0, 40).toLowerCase())) {
    return existing;
  }
  return `${existing.trim()} ${addition}`.trim();
}

function paletteDesignSystem(profile: ScreenshotColorProfile) {
  return [
    `Palette extracted from uploaded app screenshots (${profile.uiTone} UI).`,
    `Dominant: ${profile.dominantColors.join(", ")}.`,
    `Accent gradient: ${profile.accentColor} → ${profile.secondaryColor}.`,
    profile.harmonyGuidance,
  ].join(" ");
}

export function buildScreenshotColorHarmonyBlock(profile?: ScreenshotColorProfile | null): string {
  if (!profile) return "";

  return [
    "SCREENSHOT COLOR HARMONY (mandatory):",
    profile.harmonyGuidance,
    `Use accent ${profile.accentColor} and secondary ${profile.secondaryColor} for lighting accents, gradients, and environmental color grading.`,
    profile.uiTone === "light"
      ? "Room/atmosphere: bright, soft, natural light — never a dark cave unless the app UI is dark."
      : profile.uiTone === "dark"
        ? "Room/atmosphere: cinematic dark with controlled accent rim light matching the app palette."
        : "Room/atmosphere: balanced mid-tone environment harmonized with the app palette.",
    `Suggested background base tone: ${profile.backgroundBase}.`,
  ].join("\n");
}

export function applyScreenshotColorHarmonyToStoreBrief(
  brief: StrategyBrief,
  colorProfile: ScreenshotColorProfile | null,
): StrategyBrief {
  if (!colorProfile) return brief;

  return {
    ...brief,
    colorProfile,
    accentColor: colorProfile.accentColor,
    brandColor: colorProfile.secondaryColor,
    designSystem: appendUniqueTheme(brief.designSystem, paletteDesignSystem(colorProfile)),
    visualTheme: appendUniqueTheme(brief.visualTheme, colorProfile.harmonyGuidance),
  };
}

export function applyScreenshotColorHarmonyToSocialBrief(
  brief: SocialStrategyBrief,
  colorProfile: ScreenshotColorProfile | null,
): SocialStrategyBrief {
  if (!colorProfile) return brief;

  const harmony = buildScreenshotHarmonyGuidance(colorProfile);

  return {
    ...brief,
    colorProfile,
    accentColor: colorProfile.accentColor,
    brandColor: colorProfile.secondaryColor,
    visualTheme: appendUniqueTheme(brief.visualTheme, harmony),
    assets: brief.assets.map((asset) => ({
      ...asset,
      visualStyle: appendUniqueTheme(
        asset.visualStyle,
        `Harmonize with ${colorProfile.uiTone} app UI — accents ${colorProfile.accentColor}.`,
      ),
    })),
  };
}

export function applyScreenshotColorHarmonyToAutopilotBrief(
  brief: AutopilotStrategyBrief,
  colorProfile: ScreenshotColorProfile | null,
): AutopilotStrategyBrief {
  if (!colorProfile) return brief;

  const harmony = buildScreenshotHarmonyGuidance(colorProfile);

  return {
    ...brief,
    colorProfile,
    accentColor: colorProfile.accentColor,
    brandColor: colorProfile.secondaryColor,
    visualTheme: appendUniqueTheme(brief.visualTheme, harmony),
    posts: brief.posts.map((post) => ({
      ...post,
      visualStyle: appendUniqueTheme(
        post.visualStyle,
        `Match ${colorProfile.uiTone} app UI palette (${colorProfile.accentColor}).`,
      ),
    })),
  };
}

export function resolveAccentColorFromStrategy(
  strategy: {
    accentColor?: string;
    brandColor?: string;
    colorProfile?: ScreenshotColorProfile | null;
  },
  fallback = "#45d6b5",
) {
  return strategy.colorProfile?.accentColor ?? strategy.accentColor ?? strategy.brandColor ?? fallback;
}
