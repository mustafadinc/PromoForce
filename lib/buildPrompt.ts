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
  const audienceLine = targetAudience
    ? `Include a small audience line: "Built for ${targetAudience}".`
    : "";

  return [
    "Create a premium square Instagram promotional image (1080x1080) for a mobile app launch.",
    "Place the uploaded app screenshot inside a modern smartphone mockup on the right side of the composition.",
    "",
    "Use this exact marketing copy on the image (do not paraphrase, shorten, or invent new text):",
    `- Headline (large, bold): "${appName}"`,
    `- Subheadline (short description): "${description}"`,
    `- Category badge or label: "${category}"`,
    audienceLine,
    "",
    `Visual style: ${style}. ${stylePromptAddons[style]}`,
    "Layout: left side for marketing copy, right side for the phone mockup with the screenshot.",
    "The app name and short description must be clearly readable as the main text hierarchy.",
    "Premium SaaS aesthetic, clean typography, soft lighting, and high-quality composition suitable for an Instagram launch post.",
  ]
    .filter(Boolean)
    .join(" ");
}
