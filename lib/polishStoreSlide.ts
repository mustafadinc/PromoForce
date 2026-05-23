import type { StoreSlidePlan } from "@/lib/campaignTypes";
import { buildImageModelFallbackChain, getPromptCharLimit } from "@/lib/imageConfig";
import { rejectPolishIfLayoutDrift } from "@/lib/polishLayoutDrift";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for polish pass.");
  }
  return apiKey;
}

function buildFirstPolishPrompt(slide: StoreSlidePlan) {
  const breakout = slide.breakoutPanelDescription?.trim();
  return [
    "This is a SCAFFOLD App Store screenshot — rough layout with correct text, device position, and app screenshot.",
    "Transform into a polished professional App Store marketing image.",
    "",
    "KEEP EXACTLY AS-IS:",
    "- All headline text (wording, position, approximate size)",
    "- App screenshot pixels on the phone screen",
    "- Background mood and colors",
    "",
    "ENHANCE:",
    "- Photorealistic iPhone mockup with accurate proportions, reflections, subtle shadows",
    "- Professional high-budget App Store quality",
    breakout
      ? `OPTIONAL PRIMARY BREAKOUT: ${breakout}. Panel stays same orientation, scaled up, extends beyond device edges, soft drop shadow. Only if clearly visible on screen.`
      : "No breakout — the app screen speaks for itself unless an obvious UI panel reinforces the headline.",
    "",
    "NEVER add: text, buttons, badges, ratings, watermarks, duplicate headlines, app store chrome.",
    slide.asoBeat === "download_cta"
      ? "CTA SLIDE: do not add any marketing copy or UI chrome — background polish only."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSubsequentPolishPrompt(slide: StoreSlidePlan) {
  return [
    "Create the next screenshot in an App Store SET. Match the STYLE TEMPLATE image exactly.",
    "",
    "TWO REFERENCES in order:",
    "1) SCAFFOLD — layout guide: headline position, device placement, screen content",
    "2) STYLE TEMPLATE — match device frame rendering, text treatment, polish level, background style",
    "",
    "CRITICAL: Device frame must match style template — same photorealistic iPhone, size, shadows.",
    "Use scaffold layout for positioning only.",
    slide.breakoutPanelDescription?.trim()
      ? `Optional breakout: ${slide.breakoutPanelDescription}`
      : "No breakout unless obvious on screen.",
    "",
    "NEVER add text, buttons, badges, or watermarks.",
  ].join("\n");
}

export async function polishStoreSlideImage(
  scaffoldPng: Buffer,
  slide: StoreSlidePlan,
  styleReferencePng?: Buffer,
): Promise<Buffer> {
  const apiKey = getOpenAIKey();
  const models = buildImageModelFallbackChain();
  const prompt = styleReferencePng
    ? buildSubsequentPolishPrompt(slide)
    : buildFirstPolishPrompt(slide);

  let lastError = "";

  for (const model of models) {
    const body = new FormData();
    body.append("model", model);
    body.append("prompt", prompt.slice(0, getPromptCharLimit(model)));
    body.append("image[]", new Blob([new Uint8Array(scaffoldPng)], { type: "image/png" }), "scaffold.png");
    if (styleReferencePng) {
      body.append(
        "image[]",
        new Blob([new Uint8Array(styleReferencePng)], { type: "image/png" }),
        "style-template.png",
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });

    if (!response.ok) {
      lastError = await response.text();
      continue;
    }

    const result = (await response.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = result.data?.[0]?.b64_json;
    if (b64) {
      const polished = Buffer.from(b64, "base64");
      const { accepted, rejected } = await rejectPolishIfLayoutDrift(scaffoldPng, polished);
      if (rejected) {
        console.warn("[polish] Layout drift detected — using scaffold.");
      }
      return accepted;
    }
    lastError = "Polish API returned no image.";
  }

  throw new Error(lastError || "Polish pass failed.");
}
