import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type KineticHeadlineProps = {
  headline: string;
  accentColor?: string;
};

export const KineticHeadlineComposition: React.FC<KineticHeadlineProps> = ({
  headline,
  accentColor = "#6366f1",
}) => {
  const frame = useCurrentFrame();
  const words = headline.split(" ");

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", justifyContent: "center", alignItems: "center", padding: 48 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: "90%" }}>
        {words.map((word, index) => {
          const delay = index * 6;
          const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
          const y = interpolate(frame, [delay, delay + 12], [40, 0], { extrapolateRight: "clamp" });
          return (
            <span
              key={`${word}-${index}`}
              style={{
                color: index % 2 === 0 ? "#fff" : accentColor,
                fontSize: 56,
                fontWeight: 900,
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
