import { Composition } from "remotion";
import { MoodTeaserComposition } from "./compositions/MoodTeaser";
import { LogoRevealComposition } from "./compositions/LogoReveal";
import { KineticHeadlineComposition } from "./compositions/KineticHeadline";
import { ScreenshotReelComposition, type ScreenshotReelProps } from "./compositions/ScreenshotReel";
import { CountdownTeaserComposition } from "./compositions/CountdownTeaser";
import { REEL_FPS, reelTotalFrames } from "./lib/motion";

const placeholderImage = "https://placehold.co/1080x1920/png";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MoodTeaser"
        component={MoodTeaserComposition}
        durationInFrames={144}
        fps={REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          imageSrc: placeholderImage,
          headline: "Your app, promoted",
        }}
      />
      <Composition
        id="LogoReveal"
        component={LogoRevealComposition}
        durationInFrames={72}
        fps={REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          imageSrc: "https://placehold.co/200x200/png",
          headline: "PromoForce",
        }}
      />
      <Composition
        id="KineticHeadline"
        component={KineticHeadlineComposition}
        durationInFrames={120}
        fps={REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          headline: "Ship faster grow louder",
          accentColor: "#45d6b5",
        }}
      />
      <Composition
        id="ScreenshotReel"
        component={ScreenshotReelComposition}
        durationInFrames={192}
        fps={REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          images: [placeholderImage, placeholderImage, placeholderImage],
          labels: ["Feature one", "Feature two", "Feature three"],
          headline: "See it in action",
        }}
        calculateMetadata={({ props }) => {
          const images = (props as ScreenshotReelProps).images ?? [];
          return {
            durationInFrames: reelTotalFrames(Math.max(images.length, 1)),
          };
        }}
      />
      <Composition
        id="CountdownTeaser"
        component={CountdownTeaserComposition}
        durationInFrames={120}
        fps={REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          headline: "Something big is coming",
          targetLabel: "Launch",
        }}
      />
    </>
  );
};
