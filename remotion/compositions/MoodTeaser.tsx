import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { IntroHeadline, VignetteOverlay } from "../components/CinematicOverlays";

type MoodTeaserProps = {
  imageSrc: string;
  headline: string;
};

export const MoodTeaserComposition: React.FC<MoodTeaserProps> = ({ imageSrc, headline }) => {
  const frame = useCurrentFrame();
  const duration = 144;

  const scale = interpolate(frame, [0, duration], [1.04, 1.18], {
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, duration], [0, -3.5], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, duration], [0, -2], {
    extrapolateRight: "clamp",
  });
  const introOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#030508" }}>
      <AbsoluteFill style={{ opacity: introOpacity }}>
        <AbsoluteFill
          style={{
            transform: `scale(${scale}) translate(${x}%, ${y}%)`,
            transformOrigin: "center center",
          }}
        >
          <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      </AbsoluteFill>
      <VignetteOverlay />
      <IntroHeadline headline={headline} />
    </AbsoluteFill>
  );
};
