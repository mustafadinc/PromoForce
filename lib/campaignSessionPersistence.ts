import type {
  AutopilotStrategyBrief,
  AppProfile,
  CampaignType,
  GeneratedCalendarPost,
  GeneratedSlide,
  GeneratedSocialAsset,
  SocialStrategyBrief,
  StrategyBrief,
  UploadedScreenshot,
} from "@/lib/campaignTypes";
import type { CampaignStep } from "@/lib/campaignPipelineUrl";

const STORAGE_KEY = "promoforce_campaign_session";
const VERSION = 1;

type PersistedScreenshot = {
  previewUrl: string;
  index: number;
  width?: number;
  height?: number;
  fileName: string;
};

export type PersistedCampaignSession = {
  version: typeof VERSION;
  step: CampaignStep;
  campaignType: CampaignType;
  profile: AppProfile | null;
  screenshots: PersistedScreenshot[];
  storeStrategy: StrategyBrief | null;
  aiStoreStrategy: StrategyBrief | null;
  socialStrategy: SocialStrategyBrief | null;
  aiSocialStrategy: SocialStrategyBrief | null;
  autopilotStrategy: AutopilotStrategyBrief | null;
  aiAutopilotStrategy: AutopilotStrategyBrief | null;
  autopilotCampaignId: string | null;
  postIdsByDay: Record<number, string>;
  generatedSlides: GeneratedSlide[];
  generatedSocialAssets: GeneratedSocialAsset[];
  generatedCalendarPosts: GeneratedCalendarPost[];
};

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
}

export function saveCampaignSession(session: PersistedCampaignSession) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota exceeded — in-memory state still works; URL still updates.
  }
}

export async function loadCampaignSession(): Promise<{
  session: PersistedCampaignSession;
  screenshots: UploadedScreenshot[];
} | null> {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as PersistedCampaignSession;
    if (session.version !== VERSION) return null;

    const screenshots = await Promise.all(
      session.screenshots.map(async (shot) => ({
        file: await dataUrlToFile(shot.previewUrl, shot.fileName),
        previewUrl: shot.previewUrl,
        index: shot.index,
        width: shot.width,
        height: shot.height,
      })),
    );

    return { session, screenshots };
  } catch {
    return null;
  }
}

export function clearCampaignSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function serializeCampaignSession(input: {
  step: CampaignStep;
  campaignType: CampaignType;
  profile: AppProfile | null;
  screenshots: UploadedScreenshot[];
  storeStrategy: StrategyBrief | null;
  aiStoreStrategy: StrategyBrief | null;
  socialStrategy: SocialStrategyBrief | null;
  aiSocialStrategy: SocialStrategyBrief | null;
  autopilotStrategy: AutopilotStrategyBrief | null;
  aiAutopilotStrategy: AutopilotStrategyBrief | null;
  autopilotCampaignId: string | null;
  postIdsByDay: Record<number, string>;
  generatedSlides: GeneratedSlide[];
  generatedSocialAssets: GeneratedSocialAsset[];
  generatedCalendarPosts: GeneratedCalendarPost[];
}): PersistedCampaignSession {
  return {
    version: VERSION,
    step: input.step,
    campaignType: input.campaignType,
    profile: input.profile,
    screenshots: input.screenshots.map((shot) => ({
      previewUrl: shot.previewUrl,
      index: shot.index,
      width: shot.width,
      height: shot.height,
      fileName: shot.file.name || `screen-${shot.index + 1}.png`,
    })),
    storeStrategy: input.storeStrategy,
    aiStoreStrategy: input.aiStoreStrategy,
    socialStrategy: input.socialStrategy,
    aiSocialStrategy: input.aiSocialStrategy,
    autopilotStrategy: input.autopilotStrategy,
    aiAutopilotStrategy: input.aiAutopilotStrategy,
    autopilotCampaignId: input.autopilotCampaignId,
    postIdsByDay: input.postIdsByDay,
    generatedSlides: input.generatedSlides,
    generatedSocialAssets: input.generatedSocialAssets,
    generatedCalendarPosts: input.generatedCalendarPosts,
  };
}
