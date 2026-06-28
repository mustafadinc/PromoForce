import type { SceneMockupAsset } from "@/lib/assetMockup";
import { scenePhoneTopNorm } from "@/lib/assetMockup";

const SCENE_TEXT_DEVICE_GAP_PX = 72;
const MAX_SCENE_DEVICE_SHIFT_RATIO = 0.2;

export type SceneMockupPlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function computeSceneMockupPlacement(input: {
  canvasW: number;
  canvasH: number;
  asset: SceneMockupAsset;
  textBlockBottom: number;
  gapPx?: number;
}): SceneMockupPlacement {
  const { canvasW, canvasH, asset, textBlockBottom } = input;
  const gapPx = input.gapPx ?? SCENE_TEXT_DEVICE_GAP_PX;
  const screenTopY = scenePhoneTopNorm(asset) * canvasH;
  const minScreenTopY = textBlockBottom + gapPx;
  const maxShift = Math.round(canvasH * MAX_SCENE_DEVICE_SHIFT_RATIO);
  const top = Math.min(maxShift, Math.max(0, Math.round(minScreenTopY - screenTopY)));

  return {
    left: 0,
    top,
    width: canvasW,
    height: canvasH,
  };
}
