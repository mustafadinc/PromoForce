export type GenerateImageResult = {
  imageUrl?: string;
  dataUrl?: string;
  backgroundDataUrl?: string;
  backgroundSceneId?: string | null;
  lockedTypography?: import("@/lib/campaignTypes").LockedTypography;
  modelUsed?: string;
  revisedPrompt?: string;
  prompt?: string;
};

export type ImageStreamEvent =
  | { type: "status"; message: string }
  | { type: "revised_prompt"; text: string }
  | { type: "partial"; dataUrl: string; index: number; stage?: "background" | "composite" | "polish" }
  | { type: "complete"; result: GenerateImageResult }
  | { type: "error"; message: string };

export function encodeStreamEvent(event: ImageStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}
