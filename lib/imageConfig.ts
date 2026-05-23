export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_IMAGE_QUALITY = "medium";
/** 0 = reliable non-stream API first; 1–3 enables live background frames (can be slow or hang). */
export const DEFAULT_PARTIAL_IMAGES = 0;
export const DEFAULT_REVISE_PROMPTS = false;
export const DEFAULT_POLISH_PASS = false;

export const FALLBACK_IMAGE_MODELS = ["gpt-image-1.5", "gpt-image-1"] as const;

export type ImageQuality = "low" | "medium" | "high";

export function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
}

export function getRevisePromptsEnabled() {
  const raw = (process.env.OPENAI_REVISE_PROMPTS || String(DEFAULT_REVISE_PROMPTS)).toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getPolishPassEnabled() {
  const raw = (process.env.OPENAI_POLISH_PASS || String(DEFAULT_POLISH_PASS)).toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getImageQuality(): ImageQuality {
  const quality = (process.env.OPENAI_IMAGE_QUALITY || DEFAULT_IMAGE_QUALITY).toLowerCase();
  if (quality === "low" || quality === "medium" || quality === "high") {
    return quality;
  }
  return DEFAULT_IMAGE_QUALITY;
}

export function getPartialImageCount() {
  const raw = Number(process.env.OPENAI_IMAGE_PARTIALS ?? DEFAULT_PARTIAL_IMAGES);
  if (!Number.isFinite(raw)) return DEFAULT_PARTIAL_IMAGES;
  return Math.min(3, Math.max(0, Math.round(raw)));
}

/** Idle timeout while waiting for the next SSE chunk during background streaming. */
export function getImageStreamTimeoutMs() {
  const raw = Number(process.env.OPENAI_IMAGE_STREAM_TIMEOUT_MS ?? 120_000);
  if (!Number.isFinite(raw)) return 120_000;
  return Math.min(300_000, Math.max(30_000, Math.round(raw)));
}

export function getPromptCharLimit(model: string) {
  if (model.startsWith("gpt-image-2")) {
    return 32000;
  }
  return 4000;
}

export function isGptImageModel(model: string) {
  return model.startsWith("gpt-image");
}

/** gpt-image-2 rejects legacy DALL·E params like response_format. */
export function supportsImageResponseFormat(model: string) {
  return isGptImageModel(model) && !model.startsWith("gpt-image-2");
}

export function normalizeImageQuality(model: string, quality: ImageQuality): string {
  if (isGptImageModel(model)) {
    return quality;
  }
  return quality === "high" ? "hd" : "standard";
}

export function buildModelFallbackChain(preferredModel: string, fallbacks: readonly string[]) {
  return [...new Set([preferredModel, ...fallbacks])];
}

export function buildImageModelFallbackChain(preferredModel?: string) {
  return buildModelFallbackChain(preferredModel || getImageModel(), FALLBACK_IMAGE_MODELS);
}
