import { METALLIC_FRAME_H, METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import type { MockupOrientation } from "@/lib/mockupPose";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";

export type Vec3 = { x: number; y: number; z: number };

export type ProjectedPhoneFaces = {
  yawDeg: number;
  pitchDeg: number;
  front: PerspectiveQuad;
  side: PerspectiveQuad | null;
};

const DEG = Math.PI / 180;

function rotateY(p: Vec3, rad: number): Vec3 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: c * p.x + s * p.z, y: p.y, z: -s * p.x + c * p.z };
}

/** Positive pitch = top tilts away from camera (lean back). */
function rotateX(p: Vec3, rad: number): Vec3 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: p.x, y: c * p.y - s * p.z, z: s * p.y + c * p.z };
}

function project(p: Vec3, focal: number, originX: number, originY: number): { x: number; y: number } {
  const scale = focal / (focal - p.z);
  return {
    x: originX + p.x * scale,
    y: originY + p.y * scale,
  };
}

function toQuad(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): PerspectiveQuad {
  return { tl: a, tr: b, br: c, bl: d };
}

/**
 * Project a phone-shaped box (front + one visible side) with yaw + pitch.
 * Matches premium ASO mockups: strong angle, visible thickness, lean-back depth.
 */
export function projectPhoneBoxFaces(
  yawDeg: number,
  pitchDeg: number,
  depth: number,
  focal: number,
): ProjectedPhoneFaces {
  const W = METALLIC_FRAME_W;
  const H = METALLIC_FRAME_H;
  const cx = W / 2;
  const cy = H / 2;
  const cz = -depth / 2;

  const yaw = yawDeg * DEG;
  const pitch = pitchDeg * DEG;

  const transform = (p: Vec3): Vec3 => {
    const centered = { x: p.x - cx, y: p.y - cy, z: p.z - cz };
    const rotated = rotateX(rotateY(centered, yaw), pitch);
    return { x: rotated.x + cx, y: rotated.y + cy, z: rotated.z + cz };
  };

  const proj = (p: Vec3) => project(transform(p), focal, 0, 0);

  const front = toQuad(
    proj({ x: 0, y: 0, z: 0 }),
    proj({ x: W, y: 0, z: 0 }),
    proj({ x: W, y: H, z: 0 }),
    proj({ x: 0, y: H, z: 0 }),
  );

  let side: PerspectiveQuad | null = null;
  if (yawDeg > 0) {
    // Right edge toward camera — visible side is x = W (action-button side on Pro models).
    side = toQuad(
      proj({ x: W, y: 0, z: 0 }),
      proj({ x: W, y: H, z: 0 }),
      proj({ x: W, y: H, z: -depth }),
      proj({ x: W, y: 0, z: -depth }),
    );
  } else if (yawDeg < 0) {
    side = toQuad(
      proj({ x: 0, y: 0, z: 0 }),
      proj({ x: 0, y: H, z: 0 }),
      proj({ x: 0, y: H, z: -depth }),
      proj({ x: 0, y: 0, z: -depth }),
    );
  }

  return { yawDeg, pitchDeg, front, side };
}

export function focalLengthForFrame(): number {
  return METALLIC_FRAME_W * 3.4;
}

export function phoneDepthForFrame(): number {
  return METALLIC_FRAME_W * 0.11;
}

/** Side-strip width in px for a given front-face width (browser + server safe). */
export function perspectiveDepthPx(frontW: number): number {
  return Math.max(6, Math.round(phoneDepthForFrame() * (frontW / METALLIC_FRAME_W)));
}

export function poseAnglesForOrientation(orientation: MockupOrientation): {
  yawDeg: number;
  pitchDeg: number;
} {
  switch (orientation) {
    case "tilt_left":
      return { yawDeg: -23, pitchDeg: 6 };
    case "tilt_right":
      return { yawDeg: 23, pitchDeg: 6 };
    case "showcase_upright":
      return { yawDeg: 0, pitchDeg: 6 };
    default:
      return { yawDeg: 0, pitchDeg: 0 };
  }
}
