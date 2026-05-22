import type { PromoFormValues, StyleName } from "@/lib/types";

const stylePromptAddons: Record<StyleName, string> = {
  "Minimal SaaS":
    "Use generous whitespace, subtle shadows, neutral colors, clean typography, and a polished B2B SaaS look.",
  "Modern Gradient":
    "Use a vibrant but premium gradient background, soft glow, glass-like depth, and a modern launch campaign composition.",
  "Dark Tech":
    "Use a dark futuristic interface mood, high contrast, neon accent lighting, and a premium developer-tool aesthetic.",
  "App Store Launch":
    "Make it feel like a polished App Store launch announcement with clear product focus and refined visual hierarchy.",
  "Fun & Colorful":
    "Use playful colors, energetic composition, friendly shapes, and a cheerful consumer-app launch feeling.",
};

export function buildClientPrompt(values: PromoFormValues) {
  return buildPrompt(values);
}

export function buildPrompt({ appName, category, description, targetAudience, style }: PromoFormValues) {
  return [
    "Create a premium Instagram promotional image for a mobile app.",
    "Use the uploaded app screenshot as the main visual inside a modern smartphone mockup.",
    `App name: ${appName}.`,
    `Category: ${category}.`,
    `Description: ${description}.`,
    `Target audience: ${targetAudience || "mobile app users"}.`,
    `Visual style: ${style}.`,
    stylePromptAddons[style],
    "Use a clean modern layout, premium SaaS aesthetic, soft lighting, high-quality composition, minimal text, and make it suitable for an Instagram launch post.",
    "Output format: square Instagram post, 1080x1080.",
  ].join(" ");
}
