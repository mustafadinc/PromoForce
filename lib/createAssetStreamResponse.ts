import { encodeStreamEvent, type ImageStreamEvent } from "@/lib/imageStreamEvents";
import { streamStoreSlideGeneration, type GenerateStoreSlideInput } from "@/lib/openaiImageService";

export function createAssetStreamResponse(input: GenerateStoreSlideInput, meta: Record<string, unknown>) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const push = (event: ImageStreamEvent) => {
        controller.enqueue(encoder.encode(encodeStreamEvent(event)));
      };

      try {
        for await (const event of streamStoreSlideGeneration(input)) {
          if (event.type === "complete") {
            push({
              type: "complete",
              result: {
                ...event.result,
                ...meta,
              },
            });
            continue;
          }
          push(event);
        }
      } catch (error) {
        push({
          type: "error",
          message: error instanceof Error ? error.message : "Asset generation failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
