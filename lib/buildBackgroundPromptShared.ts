import type { ScreenshotColorProfile } from "@/lib/campaignTypes";
import { DEFAULT_MOCKUP_POSE, mockupPoseCompositionHint, type MockupPose } from "@/lib/mockupPose";
import { buildScreenshotColorHarmonyBlock } from "@/lib/applyScreenshotColorHarmony";

export function backgroundPromptQualityBlock(colorProfile?: ScreenshotColorProfile | null) {
  return [
    "VISUAL QUALITY (ChatGPT Images 2.0 level):",
    "- Cinematic lighting with soft depth, natural color grading, premium commercial photography feel",
    "- NEVER flat gray, flat white, empty studio, or plain gradient-only backgrounds",
    "- Rich environmental detail: bokeh, texture, wood/metal/plant surfaces, atmospheric depth, colored rim light",
    "- App Store quality — polished, modern, scroll-stopping; moody dark base with vibrant accent lighting",
    "- Cohesive brand color harmony; no harsh clipping or amateur composition",
    colorProfile?.uiTone === "light"
      ? "- Light-app UI: prefer bright, airy, high-key environments — soft daylight, pale surfaces"
      : colorProfile?.uiTone === "dark"
        ? "- Dark-app UI: prefer cinematic low-key environments with accent rim light"
        : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function backgroundPromptExclusionsBlock() {
  return [
    "STRICT EXCLUSIONS — do NOT include:",
    "- phones, device mockups, tablets, or app UI screens",
    "- any text, letters, numbers, logos, watermarks, or UI chrome",
    "- fake, hallucinated, or redrawn app interfaces",
  ].join("\n");
}

export function backgroundPromptCompositionBlock(
  usesScreenshot: boolean,
  mockupPose: MockupPose = DEFAULT_MOCKUP_POSE,
) {
  if (usesScreenshot) {
    return [
      "COMPOSITION for overlay workflow:",
      "- Top 35%: calm, uncluttered zone for headline text (soft gradient fade or negative space)",
      "- Center-lower: moderately open area for phone mockup — avoid busy detail behind device",
      "- Use directional lighting that draws the eye upward toward the headline zone",
      "",
      "MOCKUP PLACEMENT (post-production device overlay):",
      mockupPoseCompositionHint(mockupPose),
    ].join("\n");
  }

  return "COMPOSITION: full-bleed premium marketing background suitable for typography overlay.";
}
