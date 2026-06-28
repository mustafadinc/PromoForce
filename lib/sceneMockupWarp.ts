import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { fitScreenshotToMockupScreen } from "@/lib/mockupScreenFitServer";

export function quadAxisBounds(quad: PerspectiveQuad) {
  const minX = Math.min(quad.tl.x, quad.tr.x, quad.bl.x, quad.br.x);
  const maxX = Math.max(quad.tl.x, quad.tr.x, quad.bl.x, quad.br.x);
  const minY = Math.min(quad.tl.y, quad.tr.y, quad.bl.y, quad.br.y);
  const maxY = Math.max(quad.tl.y, quad.tr.y, quad.bl.y, quad.br.y);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/** Fit screenshot into the screen hole before perspective warp (contain, bottom-aligned). */
export async function prepareScreenshotForSceneQuad(
  screenshot: Buffer,
  quad: PerspectiveQuad,
): Promise<Buffer> {
  const { width, height } = quadAxisBounds(quad);
  return fitScreenshotToMockupScreen(screenshot, Math.round(width), Math.round(height));
}
