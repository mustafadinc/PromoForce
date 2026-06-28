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

const PERSISTENCE_DB_NAME = "promoforce_campaign_persistence";

const PERSISTENCE_DB_VERSION = 1;

const PERSISTENCE_STORE_NAME = "sessions";

const LATEST_SESSION_KEY = "latest";

const ANONYMOUS_SESSION_KEY = "anonymous";

let persistenceKeyPromise: Promise<string> | null = null;



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



type PersistedCampaignSessionRecord = {

  key: string;

  updatedAt: string;

  session: PersistedCampaignSession;

};



function hasRestorableContent(session: PersistedCampaignSession) {

  return Boolean(

    session.profile ||

      session.screenshots.length ||

      Object.keys(session.screenshotsByLocale ?? {}).length ||

      session.storeStrategy ||

      session.socialStrategy ||

      session.autopilotStrategy ||

      session.generatedSlides.length ||

      session.generatedSocialAssets.length ||

      session.generatedCalendarPosts.length,

  );

}



function openPersistenceDb(): Promise<IDBDatabase | null> {

  if (typeof window === "undefined" || !("indexedDB" in window)) {

    return Promise.resolve(null);

  }



  return new Promise((resolve) => {

    const request = window.indexedDB.open(PERSISTENCE_DB_NAME, PERSISTENCE_DB_VERSION);



    request.onupgradeneeded = () => {

      const db = request.result;

      if (!db.objectStoreNames.contains(PERSISTENCE_STORE_NAME)) {

        db.createObjectStore(PERSISTENCE_STORE_NAME, { keyPath: "key" });

      }

    };



    request.onsuccess = () => resolve(request.result);

    request.onerror = () => resolve(null);

    request.onblocked = () => resolve(null);

  });

}



function requestResult<T>(request: IDBRequest<T>): Promise<T | null> {

  return new Promise((resolve) => {

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => resolve(null);

  });

}



async function resolvePersistenceKey() {

  if (typeof window === "undefined") return ANONYMOUS_SESSION_KEY;



  try {

    const response = await fetch("/api/auth/session", {

      credentials: "same-origin",

      cache: "no-store",

    });

    if (!response.ok) return ANONYMOUS_SESSION_KEY;

    const session = (await response.json()) as {

      user?: { id?: string | null; email?: string | null };

    };

    const userKey = session.user?.id || session.user?.email;

    return userKey ? `user:${userKey}` : ANONYMOUS_SESSION_KEY;

  } catch {

    return ANONYMOUS_SESSION_KEY;

  }

}



function getPersistenceKey() {

  persistenceKeyPromise ??= resolvePersistenceKey();

  return persistenceKeyPromise;

}



async function savePersistentCampaignSession(session: PersistedCampaignSession) {

  if (!hasRestorableContent(session)) return;



  const db = await openPersistenceDb();

  if (!db) return;

  const key = await getPersistenceKey();



  try {

    const tx = db.transaction(PERSISTENCE_STORE_NAME, "readwrite");

    tx.objectStore(PERSISTENCE_STORE_NAME).put({

      key,

      updatedAt: new Date().toISOString(),

      session,

    } satisfies PersistedCampaignSessionRecord);

  } finally {

    db.close();

  }

}



async function loadPersistentCampaignSession(): Promise<PersistedCampaignSession | null> {

  const db = await openPersistenceDb();

  if (!db) return null;

  const key = await getPersistenceKey();



  try {

    const tx = db.transaction(PERSISTENCE_STORE_NAME, "readonly");

    const store = tx.objectStore(PERSISTENCE_STORE_NAME);

    const record = await requestResult<PersistedCampaignSessionRecord | undefined>(

      store.get(key),

    );

    if (record?.session) return record.session;

    if (key !== ANONYMOUS_SESSION_KEY) return null;

    const legacyRecord = await requestResult<PersistedCampaignSessionRecord | undefined>(

      store.get(LATEST_SESSION_KEY),

    );

    return legacyRecord?.session ?? null;

  } finally {

    db.close();

  }

}



async function clearPersistentCampaignSession() {

  const db = await openPersistenceDb();

  if (!db) return;

  const key = await getPersistenceKey();



  try {

    const tx = db.transaction(PERSISTENCE_STORE_NAME, "readwrite");

    const store = tx.objectStore(PERSISTENCE_STORE_NAME);

    store.delete(key);

    store.delete(LATEST_SESSION_KEY);

  } finally {

    db.close();

  }

}



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



type StoredCampaignSession = Omit<PersistedCampaignSession, "version"> & {

  version?: number;

};



async function restoreCampaignSession(parsed: StoredCampaignSession): Promise<{

  session: PersistedCampaignSession;

  screenshots: UploadedScreenshot[];

  screenshotsByLocale: LocaleScreenshotsMap;

} | null> {

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

    postIdsByDay: parsed.postIdsByDay ?? {},

    generatedSlides: parsed.generatedSlides ?? [],

    generatedSocialAssets: parsed.generatedSocialAssets ?? [],

    generatedCalendarPosts: parsed.generatedCalendarPosts ?? [],

  };



  return { session, screenshots, screenshotsByLocale };

}



export function saveCampaignSession(session: PersistedCampaignSession) {

  if (typeof window === "undefined") return;

  try {

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));

  } catch {

    // Quota exceeded — in-memory state still works; URL still updates.

  }

  void savePersistentCampaignSession(session).catch(() => undefined);

}



export async function loadCampaignSession(): Promise<{

  session: PersistedCampaignSession;

  screenshots: UploadedScreenshot[];

  screenshotsByLocale: LocaleScreenshotsMap;

} | null> {

  if (typeof window === "undefined") return null;



  const raw = window.sessionStorage.getItem(STORAGE_KEY);

  if (raw) {

    try {

      const restored = await restoreCampaignSession(JSON.parse(raw) as StoredCampaignSession);

      if (restored) return restored;

    } catch {

      // Fall through to the durable browser store.

    }

  }



  const persisted = await loadPersistentCampaignSession();

  return persisted ? restoreCampaignSession(persisted) : null;

}



export function clearCampaignSession() {

  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(STORAGE_KEY);

  void clearPersistentCampaignSession().catch(() => undefined);

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


