import { buildPerspectivePhoneGeometry } from "@/lib/mockupPerspectiveGeometry";
import { METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import type { MockupOrientation } from "@/lib/mockupPose";

/** Browser-safe axis-aligned bounds for a placed 3D device. */
export function perspectiveBoundsOnCanvas(
  orientation: MockupOrientation,
  frontW: number,
  stackX: number,
  stackY: number,
) {
  const geo = buildPerspectivePhoneGeometry(orientation);
  const scale = frontW / METALLIC_FRAME_W;
  return {
    minX: stackX + geo.bounds.minX * scale,
    minY: stackY + geo.bounds.minY * scale,
    maxX: stackX + geo.bounds.maxX * scale,
    maxY: stackY + geo.bounds.maxY * scale,
  };
}
