import { Composition } from "remotion";
import { MoodTeaserComposition } from "./compositions/MoodTeaser";
import { LogoRevealComposition } from "./compositions/LogoReveal";
import { KineticHeadlineComposition } from "./compositions/KineticHeadline";
import { ScreenshotReelComposition } from "./compositions/ScreenshotReel";
import { CountdownTeaserComposition } from "./compositions/CountdownTeaser";

const placeholderImage = "https://placehold.co/1080x1920/png";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MoodTeaser"
        component={MoodTeaserComposition}
        durationInFrames={144}
        fps={24}
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
        fps={24}
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
        fps={24}
        width={1080}
        height={1920}
        defaultProps={{
          headline: "Ship faster grow louder",
          accentColor: "#6366f1",
        }}
      />
      <Composition
        id="ScreenshotReel"
        component={ScreenshotReelComposition}
        durationInFrames={192}
        fps={24}
        width={1080}
        height={1920}
        defaultProps={{
          images: [placeholderImage, placeholderImage, placeholderImage],
          headline: "See it in action",
        }}
      />
      <Composition
        id="CountdownTeaser"
        component={CountdownTeaserComposition}
        durationInFrames={120}
        fps={24}
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
