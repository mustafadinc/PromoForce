import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export function VignetteOverlay() {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%), linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.75) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

type SegmentLabelProps = {
  text: string;
  localFrame: number;
};

export function SegmentLabel({ text, localFrame }: SegmentLabelProps) {
  const opacity = interpolate(localFrame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(localFrame, [6, 18], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!text.trim()) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        padding: "0 56px 96px",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#fff",
          fontSize: 46,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          textShadow: "0 4px 24px rgba(0,0,0,0.65)",
          maxWidth: "100%",
        }}
      >
        {text}
      </p>
    </AbsoluteFill>
  );
}

type IntroHeadlineProps = {
  headline: string;
  startFrame?: number;
};

export function IntroHeadline({ headline, startFrame = 8 }: IntroHeadlineProps) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [startFrame, startFrame + 20], [32, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: "120px 56px 0",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <h1
        style={{
          margin: 0,
          color: "#fff",
          fontSize: 58,
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          textShadow: "0 6px 32px rgba(0,0,0,0.7)",
          maxWidth: "92%",
        }}
      >
        {headline}
      </h1>
    </AbsoluteFill>
  );
}
