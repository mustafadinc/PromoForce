import type { CSSProperties } from "react";

import {
  METALLIC_FRAME_H,
  METALLIC_FRAME_W,
  METALLIC_SCREEN,
  METALLIC_SCREEN_CONTAIN_SCALE,
  METALLIC_SCREEN_CONTENT_BLEED_LEFT,
  METALLIC_SCREEN_CONTENT_BLEED_RIGHT,
  METALLIC_SCREEN_CONTENT_INSET_BOTTOM,
  METALLIC_SCREEN_CONTENT_INSET_SIDE,
  METALLIC_SCREEN_CONTENT_OFFSET_Y,
  METALLIC_SCREEN_CONTENT_SHIFT_X,
  METALLIC_SCREEN_OBJECT_ANCHOR_Y,
  METALLIC_SCREEN_OBJECT_SHIFT_X,
} from "@/lib/metallicIPhoneFrame";

export type MockupScreenFit = {
  bleedLeft: number;
  bleedRight: number;
  offsetY: number;
  bottomInset: number;
  sideInset: number;
  containScale: number;
  shiftX: number;
  objectShiftX: number;
  objectAnchorY: number;
  radius: number;
  contentW: number;
  contentH: number;
  pasteLeft: number;
  pasteTop: number;
};

export function resolveMockupScreenFit(screenW: number, screenH: number): MockupScreenFit {
  const scale = screenW / METALLIC_SCREEN.w;
  const bleedLeft = METALLIC_SCREEN_CONTENT_BLEED_LEFT * scale;
  const bleedRight = METALLIC_SCREEN_CONTENT_BLEED_RIGHT * scale;
  const offsetY = METALLIC_SCREEN_CONTENT_OFFSET_Y * scale;
  const bottomInset = METALLIC_SCREEN_CONTENT_INSET_BOTTOM * scale;
  const sideInset = METALLIC_SCREEN_CONTENT_INSET_SIDE * scale;
  const shiftX = METALLIC_SCREEN_CONTENT_SHIFT_X * scale;
  const objectShiftX = METALLIC_SCREEN_OBJECT_SHIFT_X * scale;
  const objectAnchorY = METALLIC_SCREEN_OBJECT_ANCHOR_Y;
  const contentW = Math.max(1, screenW - sideInset * 2);
  const contentH = Math.max(1, screenH - offsetY - bottomInset);

  return {
    bleedLeft,
    bleedRight,
    offsetY,
    bottomInset,
    sideInset,
    containScale: METALLIC_SCREEN_CONTAIN_SCALE,
    shiftX,
    objectShiftX,
    objectAnchorY,
    radius: METALLIC_SCREEN.r * scale,
    contentW,
    contentH,
    pasteLeft: shiftX - bleedLeft,
    pasteTop: offsetY,
  };
}

export function getMockupScreenStyles(frameWidthPx: number): CSSProperties {
  const scale = frameWidthPx / METALLIC_FRAME_W;
  const screenW = METALLIC_SCREEN.w * scale;
  const screenH = METALLIC_SCREEN.h * scale;
  const fit = resolveMockupScreenFit(screenW, screenH);

  return {
    left: `${(METALLIC_SCREEN.x / METALLIC_FRAME_W) * 100}%`,
    top: `${(METALLIC_SCREEN.y / METALLIC_FRAME_H) * 100}%`,
    width: `${(METALLIC_SCREEN.w / METALLIC_FRAME_W) * 100}%`,
    height: `${(METALLIC_SCREEN.h / METALLIC_FRAME_H) * 100}%`,
    borderRadius: `${fit.radius}px`,
    overflow: "hidden",
    clipPath: `inset(0 round ${fit.radius}px)`,
    ["--mockup-screen-bleed-left" as string]: `${fit.bleedLeft}px`,
    ["--mockup-screen-bleed-right" as string]: `${fit.bleedRight}px`,
    ["--mockup-screen-offset-y" as string]: `${fit.offsetY}px`,
    ["--mockup-screen-bottom-inset" as string]: `${fit.bottomInset}px`,
    ["--mockup-screen-side-inset" as string]: `${fit.sideInset}px`,
    ["--mockup-screen-contain-scale" as string]: `${fit.containScale}`,
    ["--mockup-screen-shift-x" as string]: `${fit.shiftX}px`,
    ["--mockup-screen-object-shift-x" as string]: `${fit.objectShiftX}px`,
  };
}
