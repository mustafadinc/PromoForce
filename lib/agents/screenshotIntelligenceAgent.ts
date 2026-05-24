import type { AppProfile, ScreenshotColorProfile, ScreenshotIntelligence } from "@/lib/campaignTypes";
import { normalizeScreenshotIntelligence } from "@/lib/screenshotIntelligenceFormat";
import type { StrategyImageInput } from "@/lib/strategyImageUtils";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for screenshot analysis.");
  }
  return apiKey;
}

function buildFallbackIntelligence(
  profile: AppProfile,
  screenshotCount: number,
): ScreenshotIntelligence[] {
  return Array.from({ length: screenshotCount }, (_, index) => ({
    index,
    rating: "usable" as const,
    issues: [],
    description: `${profile.appName} app screen ${index + 1}`,
    detectedFeatures: [profile.category],
    uiElements: ["mobile UI"],
    tags: [profile.appName.replace(/\s+/g, ""), profile.category.replace(/\s+/g, "")],
    suggestedHeadlines: [profile.appName, profile.description.slice(0, 40)],
    suggestedBenefits: [profile.description.slice(0, 80)],
    suggestedSocialHooks: [`See ${profile.appName} in action`],
    recommendedSlideBeats:
      index === 0
        ? (["hook"] as const)
        : index === screenshotCount - 1
          ? (["feature_benefit"] as const)
          : (["feature_benefit"] as const),
    screenType: "other" as const,
  }));
}

export async function analyzeScreenshotIntelligence(
  profile: AppProfile,
  images: StrategyImageInput[],
  colorProfile: ScreenshotColorProfile | null = null,
): Promise<ScreenshotIntelligence[]> {
  if (!images.length) return [];

  const apiKey = getOpenAIKey();
  const chatModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const screenshotCount = images.length;

  const prompt = [
    `Analyze ${screenshotCount} uploaded mobile app screenshot(s) for marketing and ASO.`,
    "",
    `App: ${profile.appName}`,
    `Category: ${profile.category}`,
    `Description: ${profile.description}`,
    `Audience: ${profile.targetAudience || "Mobile users"}`,
    colorProfile
      ? `UI tone from color sampling: ${colorProfile.uiTone}, accent ${colorProfile.accentColor}`
      : "",
    "",
    "For EACH screenshot (match image order to index 0..n-1), return JSON:",
    `{ "screenshots": [ {`,
    '  "index": 0,',
    '  "rating": "great"|"usable"|"retake",',
    '  "issues": [],',
    '  "retakeGuidance": "",',
    '  "description": "what the user sees — be specific",',
    '  "detectedFeatures": ["feature1", "feature2"],',
    '  "uiElements": ["nav bar", "chart"],',
    '  "tags": ["aso", "marketing", "tags"],',
    '  "suggestedHeadlines": ["benefit headline 1", "headline 2"],',
    '  "suggestedBenefits": ["outcome 1"],',
    '  "suggestedSocialHooks": ["Reels hook 1"],',
    '  "recommendedSlideBeats": ["hook"|"problem_outcome"|"feature_benefit"|"social_proof"|"download_cta"],',
    '  "primaryUserAction": "what user does here",',
    '  "screenType": "onboarding"|"home"|"feature_detail"|"settings"|"paywall"|"social"|"analytics"|"other"',
    "} ] }",
    "",
    "Rules:",
    "- Read each image carefully — only claim features visible on THAT screen.",
    "- suggestedHeadlines must be benefit-led, ≤8 words, not generic app name alone.",
    "- Rate retake if blurry, cropped UI, placeholder text, or empty states.",
    "- recommendedSlideBeats: pick 1–2 beats this screen best supports in an App Store set.",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
  > = [
    { type: "text", text: prompt },
    ...images.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        detail: "high" as const,
      },
    })),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a mobile product analyst and ASO strategist. You inspect app screenshots and extract marketing-ready intelligence. Be specific and honest about what is visible.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      return buildFallbackIntelligence(profile, screenshotCount);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}") as {
      screenshots?: unknown;
    };

    const normalized = normalizeScreenshotIntelligence(parsed.screenshots, screenshotCount);
    if (normalized.length >= screenshotCount) {
      return normalized.slice(0, screenshotCount);
    }

    const fallback = buildFallbackIntelligence(profile, screenshotCount);
    for (const row of normalized) {
      fallback[row.index] = row;
    }
    return fallback;
  } catch {
    return buildFallbackIntelligence(profile, screenshotCount);
  }
}
