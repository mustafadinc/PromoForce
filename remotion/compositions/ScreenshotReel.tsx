import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

type ScreenshotReelProps = {
  images: string[];
  headline: string;
};

export const ScreenshotReelComposition: React.FC<ScreenshotReelProps> = ({ images, headline }) => {
  const frame = useCurrentFrame();
  const slideDuration = 48;
  const index = Math.min(Math.floor(frame / slideDuration), Math.max(images.length - 1, 0));
  const localFrame = frame - index * slideDuration;
  const opacity = interpolate(localFrame, [0, 12, slideDuration - 12, slideDuration], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050608" }}>
      <AbsoluteFill style={{ opacity }}>
        <Img src={images[index] ?? images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 64 }}>
        <h2 style={{ color: "#fff", fontSize: 42, fontWeight: 800 }}>{headline}</h2>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
