import type {

  AutopilotStrategyBrief,

  AppProfile,

  CampaignType,

  GeneratedCalendarPost,

  GeneratedSlide,

  GeneratedSocialAsset,

  LocaleCode,

  SocialStrategyBrief,

  StrategyBrief,

  UploadedScreenshot,

} from "@/lib/campaignTypes";

import type { CampaignStep } from "@/lib/campaignPipelineUrl";

import type { LocaleScreenshotsMap } from "@/lib/localeScreenshots";

import { getScreenshotsForLocale } from "@/lib/localeScreenshots";



const STORAGE_KEY = "promoforce_campaign_session";

const VERSION = 2;



type PersistedScreenshot = {

  previewUrl: string;

  index: number;

  width?: number;

  height?: number;

  fileName: string;

  locale?: LocaleCode;

};



export type PersistedCampaignSession = {

  version: typeof VERSION;

  step: CampaignStep;

  campaignType: CampaignType;

  profile: AppProfile | null;

  screenshots: PersistedScreenshot[];

  screenshotsByLocale?: Partial<Record<LocaleCode, PersistedScreenshot[]>>;

  storeStrategy: StrategyBrief | null;

  storeStrategiesByLocale?: Partial<Record<LocaleCode, StrategyBrief>>;

  activeLocale?: LocaleCode;

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



async function restoreScreenshots(shots: PersistedScreenshot[]): Promise<UploadedScreenshot[]> {

  return Promise.all(

    shots.map(async (shot) => ({

      file: await dataUrlToFile(shot.previewUrl, shot.fileName),

      previewUrl: shot.previewUrl,

      index: shot.index,

      width: shot.width,

      height: shot.height,

      locale: shot.locale,

    })),

  );

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

  screenshotsByLocale: LocaleScreenshotsMap;

} | null> {

  if (typeof window === "undefined") return null;



  const raw = window.sessionStorage.getItem(STORAGE_KEY);

  if (!raw) return null;



  try {

    const parsed = JSON.parse(raw) as Omit<PersistedCampaignSession, "version"> & {
      version?: number;
    };

    if (parsed.version !== 1 && parsed.version !== VERSION) return null;



    const primaryLocale = parsed.profile?.locales?.[0] ?? parsed.activeLocale ?? "en";

    let screenshotsByLocale: LocaleScreenshotsMap = {};



    if (parsed.screenshotsByLocale && Object.keys(parsed.screenshotsByLocale).length) {

      for (const [locale, shots] of Object.entries(parsed.screenshotsByLocale)) {

        if (shots?.length) {

          screenshotsByLocale[locale as LocaleCode] = await restoreScreenshots(shots);

        }

      }

    } else {

      const flat = await restoreScreenshots(parsed.screenshots ?? []);

      if (flat.length) {

        screenshotsByLocale[primaryLocale] = flat;

      }

    }



    const screenshots = getScreenshotsForLocale(

      screenshotsByLocale,

      parsed.activeLocale ?? primaryLocale,

      [],

    );



    const session: PersistedCampaignSession = {

      ...parsed,

      version: VERSION,

      screenshots: parsed.screenshots ?? [],

      screenshotsByLocale: parsed.screenshotsByLocale,

    };



    return { session, screenshots, screenshotsByLocale };

  } catch {

    return null;

  }

}



export function clearCampaignSession() {

  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(STORAGE_KEY);

}



function persistScreenshotList(shots: UploadedScreenshot[]): PersistedScreenshot[] {

  return shots.map((shot) => ({

    previewUrl: shot.previewUrl,

    index: shot.index,

    width: shot.width,

    height: shot.height,

    fileName: shot.file.name || `screen-${shot.index + 1}.png`,

    locale: shot.locale,

  }));

}



export function serializeCampaignSession(input: {

  step: CampaignStep;

  campaignType: CampaignType;

  profile: AppProfile | null;

  screenshots: UploadedScreenshot[];

  screenshotsByLocale?: LocaleScreenshotsMap;

  storeStrategy: StrategyBrief | null;

  storeStrategiesByLocale?: Partial<Record<LocaleCode, StrategyBrief>>;

  activeLocale?: LocaleCode;

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

  const screenshotsByLocale: Partial<Record<LocaleCode, PersistedScreenshot[]>> = {};

  if (input.screenshotsByLocale) {

    for (const [locale, shots] of Object.entries(input.screenshotsByLocale)) {

      if (shots?.length) {

        screenshotsByLocale[locale as LocaleCode] = persistScreenshotList(shots);

      }

    }

  }



  return {

    version: VERSION,

    step: input.step,

    campaignType: input.campaignType,

    profile: input.profile,

    screenshots: persistScreenshotList(input.screenshots),

    screenshotsByLocale: Object.keys(screenshotsByLocale).length ? screenshotsByLocale : undefined,

    storeStrategy: input.storeStrategy,

    storeStrategiesByLocale: input.storeStrategiesByLocale,

    activeLocale: input.activeLocale,

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


