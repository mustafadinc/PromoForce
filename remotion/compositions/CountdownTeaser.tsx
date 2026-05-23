import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type CountdownTeaserProps = {
  headline: string;
  targetLabel?: string;
};

export const CountdownTeaserComposition: React.FC<CountdownTeaserProps> = ({
  headline,
  targetLabel = "Launch",
}) => {
  const frame = useCurrentFrame();
  const secondsLeft = Math.max(0, 5 - Math.floor(frame / 24));
  const pulse = interpolate(frame % 24, [0, 12, 24], [1, 1.08, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: 28, letterSpacing: 4, textTransform: "uppercase" }}>
        {targetLabel}
      </p>
      <div style={{ transform: `scale(${pulse})`, color: "#fff", fontSize: 120, fontWeight: 900 }}>
        {secondsLeft}
      </div>
      <h1 style={{ color: "#e2e8f0", fontSize: 40, fontWeight: 700, marginTop: 24 }}>{headline}</h1>
    </AbsoluteFill>
  );
};
