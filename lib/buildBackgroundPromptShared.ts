import type { ScreenshotColorProfile } from "@/lib/campaignTypes";
import {
  DEFAULT_MOCKUP_POSE,
  mockupPoseCompositionHint,
  resolveMockupPlacement,
  type MockupPose,
} from "@/lib/mockupPose";
import { mockupKeepOutPromptBlock } from "@/lib/mockupKeepOutZone";
import { buildScreenshotColorHarmonyBlock } from "@/lib/applyScreenshotColorHarmony";

const APP_STORE_GEN_W = 1280;
const APP_STORE_GEN_H = 2784;

export function backgroundPromptQualityBlock(colorProfile?: ScreenshotColorProfile | null) {
  return [
    "VISUAL QUALITY (premium App Store editorial — avoid AI slop):",
    "- Authentic cinematic lighting, natural color grading, premium commercial photography feel",
    "- Generous negative space — one focal element, not a busy collage",
    "- Restrained 1–2 color palette tied to brand accent; backgrounds RECEDE behind the product",
    "- NEVER flat gray, flat white, empty studio, generic stock, or obviously AI-generated mush",
    "- Rich but controlled detail: bokeh, texture, atmospheric depth — not clutter",
    "- Cohesive set-wide brand world; polished, modern, scroll-stopping",
    colorProfile?.uiTone === "light"
      ? "- Light-app UI: prefer bright, airy, high-key environments — soft daylight, pale surfaces"
      : colorProfile?.uiTone === "dark"
        ? "- Dark-app UI: prefer cinematic low-key environments with accent rim light"
        : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function backgroundPromptBannedAestheticsBlock() {
  return [
    "BANNED AESTHETICS (never generate):",
    "- Neon cyberspace grids, wavy particle tunnels, floating rings or portals",
    "- Generic 'AI teal glow on black' without a real environment",
    "- Zen stones, random mountains, water ripples, stock-photo clichés",
    "- Busy multi-element collages or template-looking neon arcs",
    "",
    "PREFER: Editorial Apple-style lifestyle photography, single warm light source, shallow DOF, real desk or nature interior.",
  ].join("\n");
}

export function backgroundPromptExclusionsBlock() {
  return [
    "STRICT EXCLUSIONS — do NOT include:",
    "- phones, device mockups, tablets, or app UI screens",
    "- any text, letters, numbers, logos, watermarks, or UI chrome",
    "- fake, hallucinated, or redrawn app interfaces",
    "- busy multi-subject compositions, random decorative clutter, or generic AI aesthetic",
  ].join("\n");
}

export function backgroundPromptAestheticsBlock(accentColor?: string, brandColor?: string) {
  return [
    "BUTTERKIT DESIGN DISCIPLINE:",
    "- One focus per frame — negative space is a feature, not wasted canvas",
    `- Restrained palette anchored on accent ${accentColor || "brand teal"}${brandColor ? ` and ${brandColor}` : ""}`,
    "- Lifestyle/people support mood but NEVER replace or compete with the app UI (added in post)",
    "- Set must feel human-crafted and intentional, not template-generated",
  ].join("\n");
}

export function backgroundPromptCompositionBlock(
  usesScreenshot: boolean,
  mockupPose: MockupPose = DEFAULT_MOCKUP_POSE,
) {
  if (usesScreenshot) {
    const resolvedPose: MockupPose = {
      ...mockupPose,
      placement: resolveMockupPlacement(mockupPose),
    };

    return [
      "COMPOSITION for overlay workflow:",
      "- Top 35%: calm, uncluttered zone for headline text (soft gradient fade or negative space)",
      "- Center-lower: open area for phone mockup — avoid busy detail behind device",
      "- Use directional lighting that draws the eye upward toward the headline zone",
      "",
      "MOCKUP PLACEMENT (post-production device overlay):",
      mockupPoseCompositionHint(mockupPose),
      "",
      mockupKeepOutPromptBlock(APP_STORE_GEN_W, APP_STORE_GEN_H, resolvedPose),
    ].join("\n");
  }

  return "COMPOSITION: full-bleed premium marketing background suitable for typography overlay.";
}

export { buildScreenshotColorHarmonyBlock };
