import type { MockupOrientation } from "@/lib/mockupPose";

import { METALLIC_FRAME_H, METALLIC_FRAME_W, METALLIC_SCREEN } from "@/lib/metallicIPhoneFrame";

import {

  focalLengthForFrame,

  phoneDepthForFrame,

  poseAnglesForOrientation,

  projectPhoneBoxFaces,

} from "@/lib/mockup3dProjection";



/** @deprecated Use poseAnglesForOrientation — kept for layout hints. */

export const PERSPECTIVE_YAW_DEG: Record<MockupOrientation, number> = {

  upright: 0,

  tilt_left: -23,

  tilt_right: 23,

};



export const PERSPECTIVE_PITCH_DEG: Record<MockupOrientation, number> = {

  upright: 0,

  tilt_left: 6,

  tilt_right: 6,

};



/** Phone thickness as a fraction of front-face width. */

export const PHONE_DEPTH_RATIO = 0.11;



export type Point2 = { x: number; y: number };



export type PerspectiveQuad = {

  tl: Point2;

  tr: Point2;

  br: Point2;

  bl: Point2;

};



export type PerspectivePhoneGeometry = {

  orientation: MockupOrientation;

  yawDeg: number;

  pitchDeg: number;

  /** Front shell quad in design coordinates (430×880 space). */

  front: PerspectiveQuad;

  /** Visible side band (null when upright). */

  side: PerspectiveQuad | null;

  /** Screen hole quad (inset inside front). */

  screen: PerspectiveQuad;

  /** Axis-aligned bounds of the full device (front + side). */

  bounds: { minX: number; minY: number; maxX: number; maxY: number };

};



function lerp(a: number, b: number, t: number) {

  return a + (b - a) * t;

}



function lerpPoint(a: Point2, b: Point2, t: number): Point2 {

  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };

}



/** Bilinear map on a quad: u,v in [0,1] along top→bottom and left→right. */

export function bilinearQuad(quad: PerspectiveQuad, u: number, v: number): Point2 {

  const top = lerpPoint(quad.tl, quad.tr, u);

  const bottom = lerpPoint(quad.bl, quad.br, u);

  return lerpPoint(top, bottom, v);

}



/** Map design-space screen rect onto the visible front face (matches frame SVG hole). */

export function screenQuadFromFront(front: PerspectiveQuad): PerspectiveQuad {

  const u0 = METALLIC_SCREEN.x / METALLIC_FRAME_W;

  const v0 = METALLIC_SCREEN.y / METALLIC_FRAME_H;

  const u1 = (METALLIC_SCREEN.x + METALLIC_SCREEN.w) / METALLIC_FRAME_W;

  const v1 = (METALLIC_SCREEN.y + METALLIC_SCREEN.h) / METALLIC_FRAME_H;



  return {

    tl: bilinearQuad(front, u0, v0),

    tr: bilinearQuad(front, u1, v0),

    br: bilinearQuad(front, u1, v1),

    bl: bilinearQuad(front, u0, v1),

  };

}



export function quadPixelDimensions(quad: PerspectiveQuad) {

  const topW = Math.hypot(quad.tr.x - quad.tl.x, quad.tr.y - quad.tl.y);

  const bottomW = Math.hypot(quad.br.x - quad.bl.x, quad.br.y - quad.bl.y);

  const leftH = Math.hypot(quad.bl.x - quad.tl.x, quad.bl.y - quad.tl.y);

  const rightH = Math.hypot(quad.br.x - quad.tr.x, quad.br.y - quad.tr.y);

  return {

    width: Math.max(1, Math.round((topW + bottomW) / 2)),

    height: Math.max(1, Math.round((leftH + rightH) / 2)),

  };

}



function quadBounds(...quads: PerspectiveQuad[]) {

  let minX = Infinity;

  let minY = Infinity;

  let maxX = -Infinity;

  let maxY = -Infinity;

  for (const q of quads) {

    for (const p of [q.tl, q.tr, q.br, q.bl]) {

      minX = Math.min(minX, p.x);

      minY = Math.min(minY, p.y);

      maxX = Math.max(maxX, p.x);

      maxY = Math.max(maxY, p.y);

    }

  }

  return { minX, minY, maxX, maxY };

}



export function usesPerspectiveMockup(orientation: MockupOrientation): boolean {

  return orientation !== "upright";

}



export function buildPerspectivePhoneGeometry(orientation: MockupOrientation): PerspectivePhoneGeometry {

  if (orientation === "upright") {

    const front: PerspectiveQuad = {

      tl: { x: 0, y: 0 },

      tr: { x: METALLIC_FRAME_W, y: 0 },

      br: { x: METALLIC_FRAME_W, y: METALLIC_FRAME_H },

      bl: { x: 0, y: METALLIC_FRAME_H },

    };

    const screen = screenQuadFromFront(front);

    return {

      orientation,

      yawDeg: 0,

      pitchDeg: 0,

      front,

      side: null,

      screen,

      bounds: quadBounds(front),

    };

  }



  const { yawDeg, pitchDeg } = poseAnglesForOrientation(orientation);

  const projected = projectPhoneBoxFaces(

    yawDeg,

    pitchDeg,

    phoneDepthForFrame(),

    focalLengthForFrame(),

  );



  const screen = screenQuadFromFront(projected.front);

  const bounds = projected.side

    ? quadBounds(projected.front, projected.side)

    : quadBounds(projected.front);



  return {

    orientation,

    yawDeg,

    pitchDeg,

    front: projected.front,

    side: projected.side,

    screen,

    bounds,

  };

}



export function scalePerspectiveGeometry(

  geometry: PerspectivePhoneGeometry,

  scale: number,

  offsetX: number,

  offsetY: number,

) {

  const map = (p: Point2): Point2 => ({

    x: offsetX + p.x * scale,

    y: offsetY + p.y * scale,

  });

  const mapQuad = (q: PerspectiveQuad): PerspectiveQuad => ({

    tl: map(q.tl),

    tr: map(q.tr),

    br: map(q.br),

    bl: map(q.bl),

  });



  const front = mapQuad(geometry.front);

  const side = geometry.side ? mapQuad(geometry.side) : null;

  const screen = mapQuad(geometry.screen);

  const bounds = side ? quadBounds(front, side) : quadBounds(front);



  return { front, side, screen, bounds };

}



export function quadToPath(q: PerspectiveQuad): string {

  return `M ${q.tl.x} ${q.tl.y} L ${q.tr.x} ${q.tr.y} L ${q.br.x} ${q.br.y} L ${q.bl.x} ${q.bl.y} Z`;

}



export function perspectiveFootprintWidth(orientation: MockupOrientation, frontWidth: number): number {

  if (!usesPerspectiveMockup(orientation)) return frontWidth;

  const geo = buildPerspectivePhoneGeometry(orientation);

  const span = geo.bounds.maxX - geo.bounds.minX;

  return Math.round(frontWidth * (span / METALLIC_FRAME_W));

}


