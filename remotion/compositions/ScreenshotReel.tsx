import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { SegmentLabel, VignetteOverlay } from "../components/CinematicOverlays";
import {
  REEL_CROSSFADE_DURATION,
  REEL_SEGMENT_DURATION,
  kenBurnsTransform,
  reelSegmentStart,
  segmentCrossfadeOpacity,
  type KenBurnsVariant,
} from "../lib/motion";

export type ScreenshotReelProps = {
  images: string[];
  labels?: string[];
  headline?: string;
};

export const ScreenshotReelComposition: React.FC<ScreenshotReelProps> = ({ images, labels, headline }) => {
  const frame = useCurrentFrame();
  const resolvedLabels =
    labels && labels.length >= images.length
      ? labels
      : images.map((_, index) => labels?.[index] ?? headline ?? "");

  return (
    <AbsoluteFill style={{ backgroundColor: "#030508" }}>
      {images.map((src, index) => {
        const start = reelSegmentStart(index);
        const end = start + REEL_SEGMENT_DURATION;
        if (frame < start || frame >= end) return null;

        const localFrame = frame - start;
        const opacity = segmentCrossfadeOpacity(
          localFrame,
          REEL_SEGMENT_DURATION,
          REEL_CROSSFADE_DURATION,
          index === 0,
        );
        const { scale, x, y } = kenBurnsTransform(
          localFrame,
          REEL_SEGMENT_DURATION,
          (index % 4) as KenBurnsVariant,
        );

        return (
          <AbsoluteFill key={`${src.slice(0, 32)}-${index}`} style={{ opacity }}>
            <AbsoluteFill
              style={{
                transform: `scale(${scale}) translate(${x}%, ${y}%)`,
                transformOrigin: "center center",
              }}
            >
              <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
            <VignetteOverlay />
            <SegmentLabel text={resolvedLabels[index] ?? ""} localFrame={localFrame} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
