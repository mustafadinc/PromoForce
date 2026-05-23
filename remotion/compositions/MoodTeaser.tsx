import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

type MoodTeaserProps = {
  imageSrc: string;
  headline: string;
};

export const MoodTeaserComposition: React.FC<MoodTeaserProps> = ({ imageSrc, headline }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 144], [1, 1.12]);
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050608" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 120,
          opacity,
        }}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: 64,
            fontWeight: 900,
            textAlign: "center",
            maxWidth: "90%",
          }}
        >
          {headline}
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
