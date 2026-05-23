import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type LogoRevealProps = {
  imageSrc: string;
  headline: string;
};

export const LogoRevealComposition: React.FC<LogoRevealProps> = ({ imageSrc, headline }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 72], [0.6, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050608", justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center" }}>
        <img src={imageSrc} alt="" style={{ width: 200, height: 200, objectFit: "contain", marginBottom: 32 }} />
        <h1 style={{ color: "#fff", fontSize: 48, fontWeight: 800 }}>{headline}</h1>
      </div>
    </AbsoluteFill>
  );
};
