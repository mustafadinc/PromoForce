import { interpolate } from "remotion";

export const REEL_FPS = 24;
export const REEL_SEGMENT_DURATION = 52;
export const REEL_CROSSFADE_DURATION = 12;

export function reelTotalFrames(imageCount: number) {
  const count = Math.max(imageCount, 1);
  return count * REEL_SEGMENT_DURATION - Math.max(count - 1, 0) * REEL_CROSSFADE_DURATION;
}

export function reelSegmentStart(index: number) {
  return index * (REEL_SEGMENT_DURATION - REEL_CROSSFADE_DURATION);
}

export type KenBurnsVariant = 0 | 1 | 2 | 3;

const kenBurnsPresets: Array<{ scale: [number, number]; x: [number, number]; y: [number, number] }> = [
  { scale: [1.06, 1.22], x: [0, -5], y: [0, -3] },
  { scale: [1.2, 1.08], x: [4, -2], y: [3, -4] },
  { scale: [1.05, 1.16], x: [-4, 3], y: [0, 2] },
  { scale: [1.14, 1.04], x: [2, -3], y: [-2, 3] },
];

export function kenBurnsTransform(localFrame: number, duration: number, variant: KenBurnsVariant) {
  const preset = kenBurnsPresets[variant % kenBurnsPresets.length];
  const scale = interpolate(localFrame, [0, duration], preset.scale, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(localFrame, [0, duration], preset.x, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(localFrame, [0, duration], preset.y, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { scale, x, y };
}

export function segmentCrossfadeOpacity(
  localFrame: number,
  duration: number,
  crossfade: number,
  isFirstSegment: boolean,
) {
  const fadeIn = isFirstSegment
    ? 1
    : interpolate(localFrame, [0, crossfade], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const fadeOut = interpolate(localFrame, [duration - crossfade, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
}
