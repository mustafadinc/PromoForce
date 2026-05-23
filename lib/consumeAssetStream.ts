"use client";

import type { GenerateImageResult, ImageStreamEvent } from "@/lib/imageStreamEvents";

export class GenerationCancelledError extends Error {
  constructor() {
    super("Generation cancelled.");
    this.name = "GenerationCancelledError";
  }
}

export type AssetStreamHandlers = {
  onStatus?: (message: string) => void;
  onRevisedPrompt?: (text: string) => void;
  onPartial?: (dataUrl: string, index: number) => void;
  onComplete?: (result: GenerateImageResult & Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

export async function consumeAssetStream(
  response: Response,
  handlers: AssetStreamHandlers,
  signal?: AbortSignal,
) {
  if (signal?.aborted) {
    throw new GenerationCancelledError();
  }

  if (!response.ok) {
    let message = "Asset generation failed.";
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = (await response.text()) || message;
    }
    handlers.onError?.(message);
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Streaming response body is empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: (GenerateImageResult & Record<string, unknown>) | undefined;

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        throw new GenerationCancelledError();
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const event = JSON.parse(line) as ImageStreamEvent;

        if (event.type === "status") {
          handlers.onStatus?.(event.message);
        } else if (event.type === "revised_prompt") {
          handlers.onRevisedPrompt?.(event.text);
        } else if (event.type === "partial") {
          handlers.onPartial?.(event.dataUrl, event.index);
        } else if (event.type === "complete") {
          finalResult = event.result;
          handlers.onComplete?.(event.result);
        } else if (event.type === "error") {
          handlers.onError?.(event.message);
          throw new Error(event.message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (signal?.aborted) {
    throw new GenerationCancelledError();
  }

  if (!finalResult) {
    throw new Error("Stream ended without a final image.");
  }

  return finalResult;
}
