import { generateStoreSlideImage, streamStoreSlideGeneration } from "@/lib/openaiImageService";
import type { GenerateImageResult } from "@/lib/imageStreamEvents";

export type { GenerateImageResult };

type GenerateStoreSlideInput = Parameters<typeof generateStoreSlideImage>[0];

type GenerateImageInput = {
  prompt: string;
  screenshot: File;
};

export async function generatePromoImageWithProvider({
  prompt,
  screenshot,
}: GenerateImageInput): Promise<GenerateImageResult> {
  return generateStoreSlideImage({ prompt, screenshot, size: "1024x1024" });
}

export async function generateStoreSlideImageNonStream(input: GenerateStoreSlideInput) {
  const provider = process.env.AI_PROVIDER || "";

  if (!provider) {
    return {} as GenerateImageResult;
  }

  if (provider === "openai") {
    return generateStoreSlideImage(input);
  }

  if (provider === "custom") {
    if (!input.screenshot) {
      throw new Error("Custom provider requires a screenshot for store slide generation.");
    }
    return generateWithCustomEndpoint({ prompt: input.prompt, screenshot: input.screenshot });
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

export { generateStoreSlideImage, streamStoreSlideGeneration };

async function generateWithCustomEndpoint({ prompt, screenshot }: { prompt: string; screenshot: File }) {
  const endpoint = process.env.AI_PROVIDER_ENDPOINT;
  const apiKey = process.env.AI_PROVIDER_API_KEY;

  if (!endpoint) {
    throw new Error("AI_PROVIDER_ENDPOINT is required when AI_PROVIDER=custom.");
  }

  const payload = new FormData();
  payload.append("prompt", prompt);
  payload.append("screenshot", screenshot);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    body: payload,
  });

  if (!response.ok) {
    throw new Error("AI provider request failed.");
  }

  const result = await response.json();
  const base64Image = result.b64_json ? `data:image/png;base64,${result.b64_json}` : undefined;

  return {
    imageUrl: result.imageUrl || result.url,
    dataUrl: result.dataUrl || base64Image,
  };
}
