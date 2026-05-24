import type { AppProfile } from "@/lib/campaignTypes";

export type CategoryStylePreset = {
  id: string;
  label: string;
  keywords: string[];
  designSystem: string;
  visualTheme: string;
  accentColor: string;
  emotion: string;
};

export const categoryStylePresets: CategoryStylePreset[] = [
  {
    id: "productivity_focus",
    label: "Productivity / Focus",
    keywords: ["productiv", "focus", "todo", "task", "work", "habit"],
    designSystem:
      "Dark cinematic UI, tight bold sans-serif headlines, emerald or teal accent glow, high contrast, minimal clutter.",
    visualTheme: "Black premium with single accent glow — deep work, cinematic minimalism.",
    accentColor: "#45d6b5",
    emotion: "cinematic minimal",
  },
  {
    id: "wellness_calm",
    label: "Wellness / Meditation",
    keywords: ["meditat", "wellness", "mindful", "sleep", "calm", "yoga", "health"],
    designSystem:
      "Soft rounded sans-serif, warm gradients, generous whitespace, muted earth tones with soft lavender or sage accents.",
    visualTheme: "Warm calm gradients, soft natural light, approachable and restorative.",
    accentColor: "#9b8cff",
    emotion: "calm",
  },
  {
    id: "finance_trust",
    label: "Finance / Crypto",
    keywords: ["finance", "bank", "invest", "crypto", "money", "budget", "trading"],
    designSystem:
      "Geometric sans-serif, high contrast navy/black base, gold or electric blue accents, grid-aligned layouts.",
    visualTheme: "Trust-forward premium — sharp contrast, data clarity, institutional confidence.",
    accentColor: "#4da3ff",
    emotion: "trust / premium",
  },
  {
    id: "games_energy",
    label: "Games / Entertainment",
    keywords: ["game", "play", "arcade", "fun", "entertain"],
    designSystem:
      "Rounded bold display type, vibrant gradients, playful particles, high energy color pops.",
    visualTheme: "Vibrant and energetic — motion-friendly colors, playful depth.",
    accentColor: "#ff6bcb",
    emotion: "energy",
  },
  {
    id: "social_connection",
    label: "Social / Dating",
    keywords: ["social", "dating", "chat", "community", "friend"],
    designSystem:
      "Friendly humanist sans, warm pastels, photo-forward layouts, soft shadows, inviting rounded cards.",
    visualTheme: "Warm connection — approachable, human, optimistic.",
    accentColor: "#ff8a65",
    emotion: "connection",
  },
];

export function matchCategoryStylePreset(profile: AppProfile): CategoryStylePreset | null {
  const haystack = `${profile.category} ${profile.description} ${profile.appName}`.toLowerCase();
  for (const preset of categoryStylePresets) {
    if (preset.keywords.some((keyword) => haystack.includes(keyword))) {
      return preset;
    }
  }
  return null;
}

export function formatCategoryPresetForPrompt(profile: AppProfile): string {
  const preset = matchCategoryStylePreset(profile);
  if (!preset) return "";

  return [
    "Category style preset (apply unless user overrides):",
    `- Preset: ${preset.label}`,
    `- designSystem: ${preset.designSystem}`,
    `- visualTheme: ${preset.visualTheme}`,
    `- accentColor: ${preset.accentColor}`,
    `- Emotion: ${preset.emotion}`,
  ].join("\n");
}
