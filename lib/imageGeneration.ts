type GenerateImageInput = {
  prompt: string;
  screenshot: File;
};

type GenerateImageResult = {
  imageUrl?: string;
  dataUrl?: string;
};

export async function generatePromoImageWithProvider({
  prompt,
  screenshot,
}: GenerateImageInput): Promise<GenerateImageResult> {
  const provider = process.env.AI_PROVIDER || "";

  if (!provider) {
    return {};
  }

  if (provider === "custom") {
    return generateWithCustomEndpoint({ prompt, screenshot });
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

async function generateWithCustomEndpoint({ prompt, screenshot }: GenerateImageInput) {
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
