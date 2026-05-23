import type { ImageSize } from "@/lib/campaignTypes";
import {
  formatExportLabel,
  getAppStoreGenerationSize,
  isAppStorePortraitAspect,
} from "@/lib/appStoreImageSizes";
import { MOCKUP_SCREEN_FIT_VERSION } from "@/lib/metallicIPhoneFrame";
import { upscaleToAppStoreExport } from "@/lib/upscaleAppStoreExport";
import { createSolidBackground } from "@/lib/createSolidBackground";
import { isSlideSolidBackground } from "@/lib/storeCreativeDirector";
import { computeLockedTypographyFromHeadline } from "@/lib/asoTextLayout";
import { compositeMarketingSlide, parseImageSize } from "@/lib/compositeMarketingSlide";
import type {
  BackgroundTreatment,
  LockedTypography,
  SetMode,
  SlideLayoutStyle,
  StoreSlidePlan,
  StoreSlideRegenerateMode,
  VisualTemplateId,
} from "@/lib/campaignTypes";
import { renderVisualTemplate } from "@/lib/visualTemplates/registry";
import {
  buildImageModelFallbackChain,
  getImageModel,
  getImageQuality,
  getImageStreamTimeoutMs,
  getPartialImageCount,
  getPolishPassEnabled,
  getPromptCharLimit,
  getRevisePromptsEnabled,
  normalizeImageQuality,
  supportsImageResponseFormat,
  type ImageQuality,
} from "@/lib/imageConfig";
import { polishStoreSlideImage } from "@/lib/polishStoreSlide";
import type { ImageStreamEvent } from "@/lib/imageStreamEvents";
import type { GenerateImageResult } from "@/lib/imageStreamEvents";

type GenerateBackgroundInput = {
  prompt: string;
  size: ImageSize;
  quality?: ImageQuality;
};

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
  }
  return apiKey;
}

async function readStreamChunkWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void reader.cancel();
          reject(new Error(`Image stream idle for ${Math.round(idleMs / 1000)}s.`));
        }, idleMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function* readSseJson(
  response: Response,
  options?: { idleTimeoutMs?: number },
): AsyncGenerator<Record<string, unknown>> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = options?.idleTimeoutMs
        ? await readStreamChunkWithIdleTimeout(reader, options.idleTimeoutMs)
        : await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          yield JSON.parse(payload) as Record<string, unknown>;
        } catch {
          // Ignore malformed chunks between stream frames.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function extractPartialImageBase64(event: Record<string, unknown>) {
  const nested = event.partial_image as { b64_json?: string } | undefined;
  return String(event.b64_json || event.partial_image_b64 || nested?.b64_json || "");
}

function extractCompletedImageItems(event: Record<string, unknown>): ImageApiItem[] | undefined {
  const data = event.data ?? event.output ?? event.images;
  if (Array.isArray(data)) {
    return data as ImageApiItem[];
  }
  return undefined;
}

function toDataUrl(base64: string) {
  return `data:image/png;base64,${base64}`;
}

type ImageApiItem = { b64_json?: string; url?: string };

function buildImageRequestBody(
  model: string,
  prompt: string,
  size: ImageSize,
  quality: ImageQuality,
  options?: { stream?: boolean; partialImages?: number },
) {
  const body: Record<string, unknown> = {
    model,
    prompt: prompt.slice(0, getPromptCharLimit(model)),
    size,
    quality: normalizeImageQuality(model, quality),
    n: 1,
  };

  if (supportsImageResponseFormat(model)) {
    body.response_format = "b64_json";
  }

  if (options?.stream) {
    body.stream = true;
    if (options.partialImages && options.partialImages > 0) {
      body.partial_images = options.partialImages;
    }
  }

  return body;
}

async function bufferFromImageApiItem(item: ImageApiItem | undefined): Promise<Buffer> {
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item?.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error("Failed to download generated image.");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("Image API returned no image data.");
}

async function* streamWithImageApi(
  apiKey: string,
  prompt: string,
  size: ImageSize,
  quality: ImageQuality,
  partialImages: number,
): AsyncGenerator<ImageStreamEvent | { type: "background_complete"; buffer: Buffer; modelUsed: string }> {
  const models = buildImageModelFallbackChain();
  let lastError = "";

  for (const model of models) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildImageRequestBody(model, prompt, size, quality, {
            stream: true,
            partialImages,
          }),
        ),
      });

      if (!response.ok) {
        lastError = await response.text();
        const isModelError =
          lastError.includes("model") || lastError.includes("does not exist") || lastError.includes("not found");
        if (isModelError && model !== models[models.length - 1]) continue;
        throw new Error(`Image API failed: ${lastError}`);
      }

      let finalBuffer: Buffer | undefined;
      const idleTimeoutMs = getImageStreamTimeoutMs();

      for await (const event of readSseJson(response, { idleTimeoutMs })) {
        const type = String(event.type || "");

        if (type === "image_generation.partial_image" || type.endsWith(".partial_image")) {
          const index = Number(event.partial_image_index ?? event.index ?? 0);
          const base64 = extractPartialImageBase64(event);
          if (base64) {
            yield { type: "partial", dataUrl: toDataUrl(base64), index, stage: "background" as const };
          }
        }

        if (
          type === "image_generation.completed" ||
          type === "image_generation.done" ||
          type.endsWith(".completed")
        ) {
          const data = extractCompletedImageItems(event);
          if (data?.[0]) {
            finalBuffer = await bufferFromImageApiItem(data[0]);
          }
        }
      }

      if (!finalBuffer) {
        throw new Error("Image API stream returned no final image.");
      }

      yield {
        type: "background_complete",
        buffer: finalBuffer,
        modelUsed: model,
      };
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Image API failed.";
      const isModelError =
        lastError.includes("model") || lastError.includes("does not exist") || lastError.includes("not found");
      if (!isModelError || model === models[models.length - 1]) {
        break;
      }
    }
  }

  throw new Error(lastError || "Image API stream failed.");
}

async function generateWithImageApi(apiKey: string, prompt: string, size: ImageSize, quality: ImageQuality) {
  const models = buildImageModelFallbackChain();
  let lastError = "";

  for (const model of models) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildImageRequestBody(model, prompt, size, quality)),
    });

    if (!response.ok) {
      lastError = await response.text();
      const isModelError =
        lastError.includes("model") || lastError.includes("does not exist") || lastError.includes("not found");
      if (isModelError && model !== models[models.length - 1]) continue;
      throw new Error(`Image API failed: ${lastError}`);
    }

    const result = (await response.json()) as { data?: ImageApiItem[] };
    const buffer = await bufferFromImageApiItem(result.data?.[0]);

    return {
      buffer,
      modelUsed: model,
    };
  }

  throw new Error(lastError || "Image API generation failed.");
}

async function revisePromptWithChat(apiKey: string, prompt: string) {
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0.3,
        max_tokens: 280,
        messages: [
          {
            role: "system",
            content: "Tighten image background prompts. No phones/UI/text. Return prompt only.",
          },
          { role: "user", content: prompt.slice(0, 1200) },
        ],
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const revised = result.choices?.[0]?.message?.content?.trim();
    return revised && revised !== prompt ? revised : undefined;
  } catch {
    return undefined;
  }
}

async function* streamBackgroundGeneration(input: GenerateBackgroundInput): AsyncGenerator<ImageStreamEvent> {
  const apiKey = getOpenAIKey();
  const quality = input.quality || getImageQuality();
  const partialImages = getPartialImageCount();
  const imageModel = getImageModel();

  let promptForImage = input.prompt;
  let revisedPrompt: string | undefined;

  if (getRevisePromptsEnabled()) {
    yield { type: "status", message: `Optimizing prompt for ${imageModel}...` };
    revisedPrompt = await revisePromptWithChat(apiKey, input.prompt);
    if (revisedPrompt) {
      promptForImage = revisedPrompt;
      yield { type: "revised_prompt", text: revisedPrompt };
    }
  }

  yield { type: "status", message: `Generating background with ${imageModel}...` };

  let backgroundBuffer: Buffer | null = null;
  let modelUsed = imageModel;

  if (partialImages > 0) {
    yield {
      type: "status",
      message: `Streaming background preview (${partialImages} partial frame${partialImages > 1 ? "s" : ""})...`,
    };
    try {
      for await (const event of streamWithImageApi(apiKey, promptForImage, input.size, quality, partialImages)) {
        if (event.type === "background_complete") {
          backgroundBuffer = event.buffer;
          modelUsed = event.modelUsed;
          continue;
        }
        if (event.type === "partial") {
          yield { ...event, stage: "background" as const };
          continue;
        }
        yield event;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "stream failed";
      yield {
        type: "status",
        message: `Background stream unavailable — using standard API (${detail}).`,
      };
    }
  }

  if (!backgroundBuffer) {
    yield {
      type: "status",
      message: `Rendering background at ${input.size} (typically 30–90 seconds)...`,
    };
    const result = await generateWithImageApi(apiKey, promptForImage, input.size, quality);
    backgroundBuffer = result.buffer;
    modelUsed = result.modelUsed;
  }

  yield {
    type: "complete",
    result: {
      dataUrl: toDataUrl(backgroundBuffer.toString("base64")),
      modelUsed,
      revisedPrompt,
      prompt: input.prompt,
    },
  };
}

export type { StoreSlideRegenerateMode };

export type GenerateStoreSlideInput = {
  prompt: string;
  backgroundPrompt?: string;
  headline?: string;
  headlineVerb?: string;
  headlineDescriptor?: string;
  subheadline?: string;
  screenshot?: File | null;
  size?: ImageSize;
  backgroundTreatment?: BackgroundTreatment;
  backgroundSceneId?: string | null;
  cachedBackgroundBase64?: string;
  appName?: string;
  accentColor?: string;
  brandColor?: string;
  setMode?: SetMode;
  headlineAccent?: string;
  featureHighlights?: string[];
  showAppBranding?: boolean;
  layoutStyle?: SlideLayoutStyle;
  isCtaSlide?: boolean;
  slidePlan?: StoreSlidePlan;
  lockedTypography?: LockedTypography;
  styleReferenceBase64?: string;
  styleAnchorHint?: string;
  regenerateMode?: StoreSlideRegenerateMode;
  existingBackgroundBase64?: string;
  styleAnchorSlide?: number;
  visualTemplate?: VisualTemplateId;
  mockupColor?: string;
};

export async function* streamStoreSlideGeneration(input: GenerateStoreSlideInput): AsyncGenerator<ImageStreamEvent> {
  const size = input.size || getAppStoreGenerationSize();
  const { width, height } = parseImageSize(size);
  const isCta = input.isCtaSlide ?? false;
  const imagePrompt = input.backgroundPrompt || input.prompt;

  let backgroundBuffer: Buffer | null = null;
  let revisedPrompt: string | undefined;
  let modelUsed: string | undefined;
  const regenerateMode = input.regenerateMode || "full";

  if (regenerateMode === "composite") {
    if (!input.existingBackgroundBase64) {
      yield {
        type: "error",
        message: "No saved background for this slide. Run a full generate or Redo background first.",
      };
      return;
    }
    yield { type: "status", message: "Reusing saved background — recompositing mockup..." };
    backgroundBuffer = Buffer.from(input.existingBackgroundBase64, "base64");
    modelUsed = "saved-background";
  } else if (regenerateMode !== "background" && input.cachedBackgroundBase64) {
    yield {
      type: "status",
      message: `Reusing shared background${input.backgroundSceneId ? ` (${input.backgroundSceneId})` : ""}...`,
    };
    backgroundBuffer = Buffer.from(input.cachedBackgroundBase64, "base64");
    modelUsed = "cached-scene";
  } else if (
    input.brandColor &&
    input.slidePlan &&
    isSlideSolidBackground(
      input.setMode || "lifestyle",
      input.slidePlan.slideNumber,
      input.styleAnchorSlide ?? 1,
    )
  ) {
    yield {
      type: "status",
      message: `Creating solid brand background (${input.brandColor})...`,
    };
    backgroundBuffer = await createSolidBackground(width, height, input.brandColor);
    modelUsed = "solid-brand";
  } else {
    for await (const event of streamBackgroundGeneration({ prompt: imagePrompt, size })) {
      if (event.type === "complete") {
        const base64 = event.result.dataUrl?.split(",")[1];
        backgroundBuffer = base64 ? Buffer.from(base64, "base64") : null;
        revisedPrompt = event.result.revisedPrompt;
        modelUsed = event.result.modelUsed;
        continue;
      }
      if (event.type === "partial") {
        yield event;
        continue;
      }
      yield event;
    }

    if (!backgroundBuffer) {
      yield { type: "error", message: "Background generation failed." };
      return;
    }
  }

  if (regenerateMode !== "composite") {
    yield {
      type: "partial",
      dataUrl: toDataUrl(backgroundBuffer.toString("base64")),
      index: 0,
      stage: "background",
    };
  }

  yield {
    type: "status",
    message: input.screenshot
      ? `Compositing screenshot + headline (mockup fit v${MOCKUP_SCREEN_FIT_VERSION})...`
      : "Applying headline overlay...",
  };

  const screenshotBuffer = input.screenshot ? Buffer.from(await input.screenshot.arrayBuffer()) : null;

  let lockedTypography = input.lockedTypography;
  const anchorSlide = input.styleAnchorSlide ?? 1;
  if (!lockedTypography && input.slidePlan?.slideNumber === anchorSlide) {
    lockedTypography = computeLockedTypographyFromHeadline(
      input.headline || "",
      input.subheadline || "",
      input.headlineVerb,
      input.headlineDescriptor,
      width,
      height,
      isCta,
    );
  }

  const template = input.visualTemplate;
  const useAltTemplate = template && template !== "hero_mockup";

  let composite = useAltTemplate
    ? await renderVisualTemplate(template, {
        background: backgroundBuffer,
        screenshot: screenshotBuffer,
        headline: input.headline || "",
        subheadline: input.subheadline || "",
        width,
        height,
        accentColor: input.accentColor,
        quoteAttribution: input.appName,
      })
    : await compositeMarketingSlide({
        background: backgroundBuffer,
        screenshot: screenshotBuffer,
        headline: input.headline || "",
        headlineVerb: input.headlineVerb,
        headlineDescriptor: input.headlineDescriptor,
        subheadline: input.subheadline || "",
        width,
        height,
        isCta,
        appName: input.appName,
        accentColor: input.accentColor,
        headlineAccent: input.headlineAccent,
        featureHighlights: input.featureHighlights,
        showAppBranding: input.showAppBranding,
        layoutStyle: input.layoutStyle,
        lockedTypography,
        mockupColor: input.mockupColor,
      });

  yield {
    type: "partial",
    dataUrl: toDataUrl(composite.toString("base64")),
    index: 0,
    stage: "composite",
  };

  const runPolish =
    getPolishPassEnabled() &&
    input.slidePlan &&
    regenerateMode !== "composite" &&
    !screenshotBuffer;

  if (runPolish) {
    try {
      yield { type: "status", message: "Polishing slide (mockup + depth)..." };
      const styleRef = input.styleReferenceBase64
        ? Buffer.from(input.styleReferenceBase64, "base64")
        : undefined;
      composite = await polishStoreSlideImage(composite, input.slidePlan!, styleRef);
      yield {
        type: "partial",
        dataUrl: toDataUrl(composite.toString("base64")),
        index: 0,
        stage: "polish",
      };
    } catch {
      yield { type: "status", message: "Polish pass skipped — using composite output." };
    }
  }

  const isAppStoreExport = isAppStorePortraitAspect(width, height);
  yield {
    type: "status",
    message: isAppStoreExport
      ? `Finalizing ${formatExportLabel()} export...`
      : "Finalizing image...",
  };

  const exported = isAppStoreExport ? await upscaleToAppStoreExport(composite) : composite;

  yield {
    type: "complete",
    result: {
      dataUrl: toDataUrl(exported.toString("base64")),
      backgroundDataUrl: toDataUrl(backgroundBuffer.toString("base64")),
      backgroundSceneId: input.backgroundSceneId ?? null,
      lockedTypography,
      modelUsed,
      revisedPrompt,
      prompt: imagePrompt,
    },
  };
}

export async function generateStoreSlideImage(input: GenerateStoreSlideInput): Promise<GenerateImageResult> {
  let final: GenerateImageResult = {};

  for await (const event of streamStoreSlideGeneration(input)) {
    if (event.type === "error") {
      throw new Error(event.message);
    }
    if (event.type === "complete") {
      final = event.result;
    }
  }

  if (!final.dataUrl && !final.imageUrl) {
    return {};
  }

  return final;
}

/** Single background image for carousel / alt templates (non-streaming). */
export async function generateBackgroundBuffer(input: GenerateBackgroundInput): Promise<Buffer> {
  const apiKey = getOpenAIKey();
  const quality = input.quality || getImageQuality();
  let promptForImage = input.prompt;

  if (getRevisePromptsEnabled()) {
    const revised = await revisePromptWithChat(apiKey, input.prompt);
    if (revised) promptForImage = revised;
  }

  const result = await generateWithImageApi(apiKey, promptForImage, input.size, quality);
  return result.buffer;
}
