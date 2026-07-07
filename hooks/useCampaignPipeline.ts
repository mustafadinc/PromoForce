"use client";

import { consumeAssetStream, GenerationCancelledError } from "@/lib/consumeAssetStream";
import { stripFormQueryParamsFromUrl } from "@/lib/cleanBrowserUrl";
import {
  buildCampaignPipelineUrl,
  phaseToStep,
  readCampaignTypeFromLocation,
  readPhaseFromLocation,
  stepToPhase,
  type CampaignStep,
} from "@/lib/campaignPipelineUrl";
import {
  clearCampaignSession,
  loadCampaignSession,
  saveCampaignSession,
  serializeCampaignSession,
} from "@/lib/campaignSessionPersistence";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPerformanceForPrompt } from "@/lib/performanceMemory";
import { canGenerate, recordGenerations } from "@/lib/usageLimits";
import {
  formatSessionBrandMemory,
  loadBrandMemory,
  saveBrandMemory,
} from "@/lib/brandMemory";
import { addDaysToDate } from "@/lib/scheduleUtils";
import { persistCampaignAsset } from "@/lib/client/persistCampaignAsset";
import { appendProgrammaticVideoFields } from "@/lib/buildProgrammaticVideoForm";
import { dataUrlToBase64Payload } from "@/lib/compactClientImage";
import {
  applyRelativeSlideTypographyScales,
  computeTypographyForSlide,
  resolveLockedTypographyForSlide,
} from "@/lib/resolveLockedTypography";
import { normalizeSlideEdit } from "@/lib/normalizeSlideEdit";
import type {
  AppProfile,
  AutopilotConfig,
  AutopilotStrategyBrief,
  CampaignType,
  GeneratedCalendarPost,
  GeneratedSlide,
  GeneratedSlideVariant,
  GeneratedSocialAsset,
  LockedTypography,
  LocaleCode,
  LocaleScreenshotsMap,
  SocialStrategyBrief,
  SlideEditorState,
  StoreSlidePlan,
  StoreSlideRegenerateMode,
  StoreSlideRegenerateOptions,
  StrategyBrief,
  UploadedScreenshot,
} from "@/lib/campaignTypes";
import { isSocialReelsAsset } from "@/lib/campaignTypes";
import { ensureSocialStrategyBrief } from "@/lib/socialStrategyNormalize";
import {
  auditSetCoherenceClient,
  type SetCoherenceAudit,
} from "@/lib/agents/setCoherenceAgent";
import {
  appendLocaleScreenshotsToFormData,
  flattenLocaleScreenshots,
  getScreenshotsForLocale,
  normalizeLocaleScreenshotsMap,
} from "@/lib/localeScreenshots";
import { normalizeMockupAssetId } from "@/lib/assetMockup";
import { getBeatForSlide } from "@/lib/storeSetAsoFramework";

function normalizeStrategyBeats(strategy: StrategyBrief | null): StrategyBrief | null {
  if (!strategy) return null;
  const slideCount = strategy.slides.length;
  return {
    ...strategy,
    slides: strategy.slides.map((slide) => ({
      ...slide,
      asoBeat: getBeatForSlide(slide.slideNumber, slideCount),
    })),
  };
}

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function scaleLockedTypography(
  typography: LockedTypography | undefined,
  scale: number | undefined,
): LockedTypography | undefined {
  if (!typography || !scale || Math.abs(scale - 1) < 0.01) return typography;
  const safeScale = Math.min(1.35, Math.max(0.65, scale));
  return {
    verbSize: Math.round(typography.verbSize * safeScale),
    descriptorSize: Math.round(typography.descriptorSize * safeScale),
    subSize: Math.round(typography.subSize * safeScale),
  };
}

async function resolveDataUrl(imageSource: string) {
  if (imageSource.startsWith("data:")) return imageSource;

  const imageResponse = await fetch(imageSource);
  const blob = await imageResponse.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useCampaignPipeline() {
  const router = useRouter();
  const [step, setStep] = useState<CampaignStep>("setup");
  const [sessionReady, setSessionReady] = useState(false);
  const [campaignType, setCampaignType] = useState<CampaignType>("app_store");
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [screenshotsByLocale, setScreenshotsByLocale] = useState<LocaleScreenshotsMap>({});
  const [storeStrategy, _setStoreStrategy] = useState<StrategyBrief | null>(null);
  const setStoreStrategy = useCallback((val: StrategyBrief | null | ((prev: StrategyBrief | null) => StrategyBrief | null)) => {
    _setStoreStrategy((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      return normalizeStrategyBeats(next);
    });
  }, []);
  const [storeStrategiesByLocale, setStoreStrategiesByLocale] = useState<
    Partial<Record<LocaleCode, StrategyBrief>>
  >({});
  const [activeLocale, setActiveLocale] = useState<LocaleCode>("en");
  const [aiStoreStrategy, setAiStoreStrategy] = useState<StrategyBrief | null>(null);
  const [socialStrategy, setSocialStrategy] = useState<SocialStrategyBrief | null>(null);
  const [aiSocialStrategy, setAiSocialStrategy] = useState<SocialStrategyBrief | null>(null);
  const [autopilotStrategy, setAutopilotStrategy] = useState<AutopilotStrategyBrief | null>(null);
  const [aiAutopilotStrategy, setAiAutopilotStrategy] = useState<AutopilotStrategyBrief | null>(null);
  const [autopilotCampaignId, setAutopilotCampaignId] = useState<string | null>(null);
  const [postIdsByDay, setPostIdsByDay] = useState<Record<number, string>>({});
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [generatedSocialAssets, setGeneratedSocialAssets] = useState<GeneratedSocialAsset[]>([]);
  const [generatedCalendarPosts, setGeneratedCalendarPosts] = useState<GeneratedCalendarPost[]>([]);
  const [customBackgroundsBySlide, setCustomBackgroundsBySlide] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [partialPreviewUrl, setPartialPreviewUrl] = useState("");
  const [regeneratingSlideNumber, setRegeneratingSlideNumber] = useState<number | null>(null);
  const [coherenceAudit, setCoherenceAudit] = useState<SetCoherenceAudit | null>(null);
  const [localeMismatchCount, setLocaleMismatchCount] = useState(0);
  const [isAuditing, setIsAuditing] = useState(false);
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const generationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void (async () => {
      const restored = await loadCampaignSession();
      const urlPhase = readPhaseFromLocation(window.location.search);
      const urlCampaign = readCampaignTypeFromLocation(window.location.search);

      if (restored) {
        const { session, screenshots: restoredScreenshots, screenshotsByLocale: restoredByLocale } =
          restored;
        setCampaignType(urlCampaign ?? session.campaignType);
        setProfile(session.profile);
        setScreenshotsByLocale(restoredByLocale);
        setScreenshots(restoredScreenshots);
        setStoreStrategy(session.storeStrategy);
        setStoreStrategiesByLocale(session.storeStrategiesByLocale || {});
        setActiveLocale(session.activeLocale || session.storeStrategy?.locale || "en");
        setAiStoreStrategy(session.aiStoreStrategy);
        setSocialStrategy(
          session.socialStrategy && session.profile
            ? ensureSocialStrategyBrief(
                session.socialStrategy,
                session.profile,
                restoredScreenshots.length,
              )
            : session.socialStrategy,
        );
        setAiSocialStrategy(
          session.aiSocialStrategy && session.profile
            ? ensureSocialStrategyBrief(
                session.aiSocialStrategy,
                session.profile,
                restoredScreenshots.length,
              )
            : session.aiSocialStrategy,
        );
        setAutopilotStrategy(session.autopilotStrategy);
        setAiAutopilotStrategy(session.aiAutopilotStrategy);
        setAutopilotCampaignId(session.autopilotCampaignId);
        setPostIdsByDay(session.postIdsByDay);
        setGeneratedSlides(session.generatedSlides);
        setGeneratedSocialAssets(session.generatedSocialAssets);
        setGeneratedCalendarPosts(session.generatedCalendarPosts);

        const hasStrategy = Boolean(
          session.storeStrategy || session.socialStrategy || session.autopilotStrategy,
        );
        const hasExport = Boolean(
          session.generatedSlides.length ||
            session.generatedSocialAssets.length ||
            session.generatedCalendarPosts.length,
        );

        if (urlPhase === "export" && hasExport) {
          setStep("gallery");
        } else if (urlPhase === "strategy" && hasStrategy) {
          setStep("strategy");
        } else {
          setStep(session.step);
        }
      } else if (urlPhase && urlPhase !== "setup") {
        setStep(phaseToStep(urlPhase));
        if (urlCampaign) setCampaignType(urlCampaign);
      }

      setSessionReady(true);
    })();
  }, []);

  const sessionSnapshot = useMemo(
    () =>
      serializeCampaignSession({
        step,
        campaignType,
        profile,
        screenshots,
        screenshotsByLocale,
        storeStrategy,
        storeStrategiesByLocale,
        activeLocale,
        aiStoreStrategy,
        socialStrategy,
        aiSocialStrategy,
        autopilotStrategy,
        aiAutopilotStrategy,
        autopilotCampaignId,
        postIdsByDay,
        generatedSlides,
        generatedSocialAssets,
        generatedCalendarPosts,
      }),
    [
      step,
      campaignType,
      profile,
      screenshots,
      screenshotsByLocale,
      storeStrategy,
      storeStrategiesByLocale,
      activeLocale,
      aiStoreStrategy,
      socialStrategy,
      aiSocialStrategy,
      autopilotStrategy,
      aiAutopilotStrategy,
      autopilotCampaignId,
      postIdsByDay,
      generatedSlides,
      generatedSocialAssets,
      generatedCalendarPosts,
    ],
  );

  useEffect(() => {
    if (!sessionReady) return;
    saveCampaignSession(sessionSnapshot);
    const next = buildCampaignPipelineUrl(stepToPhase(step), campaignType);
    router.replace(next, { scroll: false });
  }, [sessionReady, sessionSnapshot, step, campaignType, router]);

  const refreshCoherenceAudit = async (brief: StrategyBrief | null) => {
    if (!brief) {
      setCoherenceAudit(null);
      return;
    }
    setIsAuditing(true);
    try {
      const audit = await auditSetCoherenceClient(brief);
      setCoherenceAudit(audit);
    } catch {
      setCoherenceAudit(null);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (campaignType !== "app_store" || !storeStrategy || step !== "strategy") return;
    const timer = window.setTimeout(() => {
      void refreshCoherenceAudit(storeStrategy);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [storeStrategy, campaignType, step]);

  const beginGeneration = () => {
    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    return controller.signal;
  };

  const cancelGeneration = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setIsGenerating(false);
    setPartialPreviewUrl("");
    setProgressLabel("Generation cancelled.");
    setErrorMessage("");
  };

  const isCancelledError = (error: unknown) =>
    error instanceof GenerationCancelledError ||
    (error instanceof DOMException && error.name === "AbortError");

  const assertCanGenerate = (count: number) => {
    const gate = canGenerate(count);
    if (!gate.ok) {
      throw new Error(`Daily limit reached (${gate.used}/${gate.limit}). Upgrade to Pro for more generations.`);
    }
    return gate;
  };

  const bumpUsage = (count: number) => {
    recordGenerations(count);
    setUsageRefreshKey((value) => value + 1);
  };

  const hasEdits = useMemo(() => {
    if (campaignType === "app_store") return !jsonEqual(storeStrategy, aiStoreStrategy);
    if (campaignType === "social_launch") return !jsonEqual(socialStrategy, aiSocialStrategy);
    return !jsonEqual(autopilotStrategy, aiAutopilotStrategy);
  }, [
    campaignType,
    storeStrategy,
    aiStoreStrategy,
    socialStrategy,
    aiSocialStrategy,
    autopilotStrategy,
    aiAutopilotStrategy,
  ]);

  const screenshotPreviews = useMemo(
    () =>
      screenshots.map(({ index, previewUrl, width, height }) => ({
        index,
        previewUrl,
        width,
        height,
      })),
    [screenshots],
  );

  const customBackgroundKey = (locale: LocaleCode, slideNumber: number) => `${locale}:${slideNumber}`;

  const getCustomBackgroundForSlide = (locale: LocaleCode, slideNumber: number) =>
    customBackgroundsBySlide[customBackgroundKey(locale, slideNumber)];

  const customBackgroundsForActiveLocale = useMemo(() => {
    const entries = Object.entries(customBackgroundsBySlide)
      .map(([key, dataUrl]) => {
        const [locale, slideNumber] = key.split(":");
        return {
          locale,
          slideNumber: Number(slideNumber),
          dataUrl,
        };
      })
      .filter((entry) => entry.locale === activeLocale && Number.isFinite(entry.slideNumber));
    return Object.fromEntries(entries.map((entry) => [entry.slideNumber, entry.dataUrl])) as Record<number, string>;
  }, [activeLocale, customBackgroundsBySlide]);

  const setCustomSlideBackground = (
    slideNumber: number,
    dataUrl: string | null,
    locale: LocaleCode = activeLocale,
  ) => {
    setCustomBackgroundsBySlide((current) => {
      const key = customBackgroundKey(locale, slideNumber);
      if (!dataUrl) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: dataUrl };
    });
  };

  const appendProfileFields = (formData: FormData) => {
    if (!profile) return;

    formData.append("appName", profile.appName);
    formData.append("category", profile.category);
    formData.append("description", profile.description);
    formData.append("targetAudience", profile.targetAudience);
    if (profile.slideCount) {
      formData.append("slideCount", String(profile.slideCount));
    }
    if (profile.locales?.length) {
      formData.append("locales", JSON.stringify(profile.locales));
    }
    if (profile.appTitle) formData.append("appTitle", profile.appTitle);
    if (profile.appSubtitle) formData.append("appSubtitle", profile.appSubtitle);
    if (profile.keywords) formData.append("keywords", profile.keywords);
    if (profile.socialProof?.reviewQuotes?.length) {
      formData.append("reviewQuotes", profile.socialProof.reviewQuotes.join("\n"));
    }
    if (profile.socialProof?.downloadCount) {
      formData.append("downloadCount", profile.socialProof.downloadCount);
    }
    if (profile.socialProof?.rating) {
      formData.append("rating", String(profile.socialProof.rating));
    }
  };

  const appendSlideScreenshot = (
    formData: FormData,
    screenshotIndex: number | null,
    locale?: LocaleCode,
  ) => {
    const shots = locale
      ? getScreenshotsForLocale(screenshotsByLocale, locale, screenshots)
      : screenshots;
    shots.forEach((item) => formData.append("screenshots", item.file));
    if (screenshotIndex === null || screenshotIndex < 0) return;
    const shot = shots[screenshotIndex];
    if (shot) formData.append("screenshot", shot.file);
  };

  const appendFormBasics = (formData: FormData) => {
    appendProfileFields(formData);
    screenshots.forEach((item) => formData.append("screenshots", item.file));
  };

  const createStrategy = async (
    nextCampaignType: CampaignType,
    nextProfile: AppProfile,
    input: UploadedScreenshot[] | LocaleScreenshotsMap,
    autopilotConfig?: AutopilotConfig,
    localeMismatchWarnings?: Partial<Record<LocaleCode, string>>,
  ) => {
    const isAppStore = nextCampaignType === "app_store";
    const locales = nextProfile.locales?.length ? nextProfile.locales : (["en"] as LocaleCode[]);
    const nextByLocale: LocaleScreenshotsMap = isAppStore
      ? normalizeLocaleScreenshotsMap(
          Array.isArray(input) ? { [locales[0]!]: input } : input,
          locales,
        )
      : { en: Array.isArray(input) ? input : flattenLocaleScreenshots(input) };
    const primaryLocale = locales[0] ?? "en";
    const nextScreenshots = getScreenshotsForLocale(nextByLocale, primaryLocale, []);
    const uploadedSlideCount = Math.max(
      ...locales.map((locale) => nextByLocale[locale]?.length ?? 0),
      nextScreenshots.length,
    );
    const requestedSlideCount = Math.max(nextProfile.slideCount ?? 0, uploadedSlideCount);
    const effectiveProfile =
      isAppStore && requestedSlideCount > 0
        ? { ...nextProfile, slideCount: requestedSlideCount }
        : nextProfile;

    setIsPlanning(true);
    setErrorMessage("");
    setCampaignType(nextCampaignType);
    setProfile(effectiveProfile);
    setLocaleMismatchCount(
      localeMismatchWarnings ? Object.keys(localeMismatchWarnings).length : 0,
    );
    setScreenshotsByLocale(nextByLocale);
    setScreenshots(nextScreenshots);
    setGeneratedSlides([]);
    setGeneratedSocialAssets([]);
    setGeneratedCalendarPosts([]);
    setCustomBackgroundsBySlide({});
    setStoreStrategy(null);
    setStoreStrategiesByLocale({});
    setActiveLocale(effectiveProfile.locales?.[0] || "en");
    setAiStoreStrategy(null);
    setSocialStrategy(null);
    setAiSocialStrategy(null);
    setAutopilotStrategy(null);
    setAiAutopilotStrategy(null);

    try {
      const formData = new FormData();
      formData.append("appName", effectiveProfile.appName);
      formData.append("category", effectiveProfile.category);
      formData.append("description", effectiveProfile.description);
      formData.append("targetAudience", effectiveProfile.targetAudience);
      if (effectiveProfile.slideCount) {
        formData.append("slideCount", String(effectiveProfile.slideCount));
      }
      if (effectiveProfile.locales?.length) {
        formData.append("locales", JSON.stringify(effectiveProfile.locales));
      }
      if (effectiveProfile.appTitle) formData.append("appTitle", effectiveProfile.appTitle);
      if (effectiveProfile.appSubtitle) formData.append("appSubtitle", effectiveProfile.appSubtitle);
      if (effectiveProfile.keywords) formData.append("keywords", effectiveProfile.keywords);
      if (effectiveProfile.socialProof?.reviewQuotes?.length) {
        formData.append("reviewQuotes", effectiveProfile.socialProof.reviewQuotes.join("\n"));
      }
      if (effectiveProfile.socialProof?.downloadCount) {
        formData.append("downloadCount", effectiveProfile.socialProof.downloadCount);
      }
      if (effectiveProfile.socialProof?.rating) {
        formData.append("rating", String(effectiveProfile.socialProof.rating));
      }
      if (isAppStore) {
        appendLocaleScreenshotsToFormData(formData, nextByLocale, locales);
      } else {
        nextScreenshots.forEach((item) => formData.append("screenshots", item.file));
      }

      let endpoint = "/api/strategy/generate";
      if (nextCampaignType === "social_launch") {
        endpoint = "/api/strategy/generate-social";
        formData.append("performanceContext", formatPerformanceForPrompt(effectiveProfile.appName));
      }
      if (nextCampaignType === "marketing_autopilot") {
        endpoint = "/api/strategy/generate-autopilot";
        formData.append("duration", String(autopilotConfig?.duration || 7));
        formData.append("startDate", autopilotConfig?.startDate || new Date().toISOString().slice(0, 10));
        formData.append("performanceContext", formatPerformanceForPrompt(effectiveProfile.appName));

        const brandMemory = loadBrandMemory(effectiveProfile.appName);
        if (brandMemory) {
          formData.append("brandMemory", JSON.stringify(brandMemory));
        }
      }

      const response = await fetch(endpoint, { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Strategy generation failed.");
      }

      if (nextCampaignType === "app_store") {
        const strategies = (result.strategies || {}) as Partial<Record<LocaleCode, StrategyBrief>>;
        const primary = (result.primaryLocale || effectiveProfile.locales?.[0] || "en") as LocaleCode;
        setStoreStrategiesByLocale(strategies);
        setActiveLocale(primary);
        setStoreStrategy(result.strategy || strategies[primary] || null);
        setAiStoreStrategy(result.strategy || strategies[primary] || null);
        void refreshCoherenceAudit(result.strategy || strategies[primary] || null);
      } else if (nextCampaignType === "social_launch") {
        setSocialStrategy(result.strategy);
        setAiSocialStrategy(result.strategy);
      } else {
        setAutopilotStrategy(result.strategy);
        setAiAutopilotStrategy(result.strategy);
        if (result.campaignId) {
          setAutopilotCampaignId(String(result.campaignId));
        }
        if (result.postIdsByDay && typeof result.postIdsByDay === "object") {
          setPostIdsByDay(result.postIdsByDay as Record<number, string>);
        }
      }

      stripFormQueryParamsFromUrl();
      setStep("strategy");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Strategy generation failed.");
    } finally {
      setIsPlanning(false);
    }
  };

  const generateSingleStoreSlide = async (
    slide: StoreSlidePlan,
    strategy: StrategyBrief,
    signal: AbortSignal,
    backgroundSceneCache: Record<string, string>,
    lockedTypography: LockedTypography | undefined,
    styleReferenceDataUrl: string | undefined,
    onProgress: (message: string) => void,
    onPartial: (dataUrl: string, stage?: "background" | "composite" | "polish") => void,
    options?: {
      regenerateMode?: StoreSlideRegenerateMode;
      existingBackgroundDataUrl?: string;
      mockupColor?: string;
      mockupPose?: import("@/lib/mockupPose").MockupPose;
      mockupAssetId?: import("@/lib/assetMockup").MockupAssetId;
    },
    locale: LocaleCode = activeLocale,
  ) => {
    const formData = new FormData();
    appendProfileFields(formData);
    appendSlideScreenshot(formData, slide.screenshotIndex, locale);
    formData.append("strategy", JSON.stringify(strategy));
    formData.append("slide", JSON.stringify(slide));
    formData.append("backgroundSceneCache", JSON.stringify(backgroundSceneCache));
    if (lockedTypography) {
      formData.append("lockedTypography", JSON.stringify(lockedTypography));
    }
    if (styleReferenceDataUrl) {
      const raw = await dataUrlToBase64Payload(styleReferenceDataUrl);
      formData.append("styleReferenceBase64", raw);
    }
    if (options?.regenerateMode) {
      formData.append("regenerateMode", options.regenerateMode);
    }
    if (options?.existingBackgroundDataUrl) {
      const rawBg = options.existingBackgroundDataUrl.includes(",")
        ? options.existingBackgroundDataUrl.split(",")[1]
        : options.existingBackgroundDataUrl;
      formData.append("existingBackgroundBase64", rawBg);
    }
    if (options?.mockupColor) {
      formData.append("mockupColor", options.mockupColor);
    }
    if (options?.mockupPose) {
      formData.append("mockupPose", JSON.stringify(options.mockupPose));
    }
    if (options?.mockupAssetId) {
      formData.append("mockupAssetId", options.mockupAssetId);
    }

    const response = await fetch("/api/assets/generate-slide", { method: "POST", body: formData, signal });
    return consumeAssetStream(
      response,
      {
        onStatus: onProgress,
        onRevisedPrompt: () => onProgress(`Slide ${slide.slideNumber}: AI revised the background prompt...`),
        onPartial: (dataUrl, _index, stage) => onPartial(dataUrl, stage),
      },
      signal,
    );
  };

  const generateStoreSet = async (options?: { variantsPerSlide?: number }) => {
    const localeEntries = Object.entries(storeStrategiesByLocale).filter(
      (entry): entry is [LocaleCode, StrategyBrief] => Boolean(entry[1]),
    );
    const strategiesToGenerate =
      localeEntries.length > 0
        ? localeEntries
        : storeStrategy
          ? [[(storeStrategy.locale || activeLocale) as LocaleCode, storeStrategy] as [LocaleCode, StrategyBrief]]
          : [];

    if (!profile || strategiesToGenerate.length === 0) return;

    const variantsPerSlide = Math.min(3, Math.max(1, options?.variantsPerSlide ?? 1));
    const signal = beginGeneration();
    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedSlides([]);
    setStep("gallery");

    const slides: GeneratedSlide[] = [];

    try {
      const totalCalls =
        strategiesToGenerate.reduce(
          (sum, [locale, strategy]) =>
            sum +
            strategy.slides.filter((slide) => !getCustomBackgroundForSlide(locale, slide.slideNumber)).length,
          0,
        ) *
        variantsPerSlide;
      assertCanGenerate(totalCalls);

      for (const [locale, localeStrategy] of strategiesToGenerate) {
        const backgroundSceneCache: Record<string, string> = {};
        let lockedTypography: LockedTypography | undefined;
        let styleReferenceDataUrl: string | undefined;

        for (const slide of localeStrategy.slides) {
          if (signal.aborted) break;

          setPartialPreviewUrl("");
          setProgressLabel(
            `[${locale.toUpperCase()}] Generating slide ${slide.slideNumber} of ${localeStrategy.slides.length}...`,
          );

          const variantResults: GeneratedSlideVariant[] = [];
          let lastGenerationResult: Awaited<ReturnType<typeof generateSingleStoreSlide>> | null = null;
          const customBackgroundDataUrl = getCustomBackgroundForSlide(locale, slide.slideNumber);
          const slideVariantCount = customBackgroundDataUrl ? 1 : variantsPerSlide;

          for (let variantIndex = 0; variantIndex < slideVariantCount; variantIndex += 1) {
            if (signal.aborted) break;

            const anchorSlide = localeStrategy.slides.find(
              (candidate) => candidate.slideNumber === (localeStrategy.styleAnchorSlide || 1),
            );
            const slideLockedTypography = lockedTypography
              ? applyRelativeSlideTypographyScales(lockedTypography, slide, anchorSlide)
              : resolveLockedTypographyForSlide(localeStrategy, slide, locale);
            const shouldReuseSceneBackgrounds = localeStrategy.setMode !== "lifestyle";

            const result = await generateSingleStoreSlide(
              slide,
              localeStrategy,
              signal,
              shouldReuseSceneBackgrounds ? backgroundSceneCache : {},
              slideLockedTypography,
              styleReferenceDataUrl,
              (message) =>
                setProgressLabel(
                  slideVariantCount > 1
                    ? `[${locale}] Slide ${slide.slideNumber} v${variantIndex + 1}: ${message}`
                    : `[${locale}] Slide ${slide.slideNumber}: ${message}`,
                ),
              (dataUrl) => setPartialPreviewUrl(dataUrl),
              customBackgroundDataUrl
                ? {
                    regenerateMode: "composite",
                    existingBackgroundDataUrl: customBackgroundDataUrl,
                  }
                : undefined,
              locale,
            );
            lastGenerationResult = result;

            const imageSource = result.dataUrl || result.imageUrl;
            if (!imageSource) {
              throw new Error(`Slide ${slide.slideNumber} variant ${variantIndex + 1} returned no image.`);
            }

            const resolved = await resolveDataUrl(imageSource);

            if (
              shouldReuseSceneBackgrounds &&
              slide.backgroundSceneId &&
              typeof result.backgroundDataUrl === "string" &&
              !backgroundSceneCache[slide.backgroundSceneId]
            ) {
              const rawBackground = result.backgroundDataUrl.split(",")[1];
              if (rawBackground) {
                backgroundSceneCache[slide.backgroundSceneId] = rawBackground;
              }
            }

            if (slide.slideNumber === (localeStrategy.styleAnchorSlide || 1)) {
              if (result.lockedTypography) {
                lockedTypography = result.lockedTypography;
              }
              styleReferenceDataUrl = resolved;
            }

            variantResults.push({
              id: `v${variantIndex + 1}`,
              dataUrl: resolved,
              prompt: String(result.revisedPrompt || result.prompt || ""),
            });
            if (!customBackgroundDataUrl) {
              bumpUsage(1);
            }
          }

          const selected = variantResults[0];
          const backgroundDataUrl =
            typeof lastGenerationResult?.backgroundDataUrl === "string"
              ? lastGenerationResult.backgroundDataUrl
              : undefined;
          slides.push({
            slideNumber: slide.slideNumber,
            role: slide.role,
            asoBeat: slide.asoBeat,
            locale,
            headline: slide.headline,
            subheadline: slide.subheadline,
            dataUrl: selected.dataUrl,
            prompt: selected.prompt,
            sourceDataUrl: selected.dataUrl,
            backgroundDataUrl,
            mockupPose: slide.mockupPose,
            mockupAssetId: normalizeMockupAssetId(slide.mockupAssetId),
            variants: variantResults.length > 1 ? variantResults : undefined,
            selectedVariantId: selected.id,
          });
          setPartialPreviewUrl("");
          setGeneratedSlides([...slides]);
        }
      }

      if (!signal.aborted) {
        setProgressLabel(slides.length ? "All slides generated." : "Generation cancelled.");
      }
    } catch (error) {
      if (!isCancelledError(error)) {
        const partial = slides.length;
        const base = error instanceof Error ? error.message : "Store set generation failed.";
        setErrorMessage(
          partial > 0
            ? `${base} (${partial} slides were saved — retry generation for the rest.)`
            : base,
        );
      }
    } finally {
      generationAbortRef.current = null;
      setIsGenerating(false);
    }
  };

  const regenerateStoreSlide = async (
    slideNumber: number,
    mode: StoreSlideRegenerateMode = "full",
    options?: StoreSlideRegenerateOptions,
  ) => {
    if (!profile || !storeStrategy) return;

    const slideLocale =
      generatedSlides.find((item) => item.slideNumber === slideNumber)?.locale ?? activeLocale;
    const localeStrategy = storeStrategiesByLocale[slideLocale] ?? storeStrategy;
    const slide = localeStrategy.slides.find((s) => s.slideNumber === slideNumber);
    if (!slide) return;
    const localeShots = getScreenshotsForLocale(screenshotsByLocale, slideLocale, screenshots);
    const effectiveSlide = options?.slidePatch
      ? normalizeSlideEdit(slide, options.slidePatch, localeShots.length, {
          strategy: localeStrategy,
          appProfile: profile,
        })
      : slide;
    const effectiveStrategy =
      effectiveSlide === slide
        ? localeStrategy
        : {
            ...localeStrategy,
            slides: localeStrategy.slides.map((item) =>
              item.slideNumber === slideNumber ? effectiveSlide : item,
            ),
          };

    const existingSlide = generatedSlides.find((s) => s.slideNumber === slideNumber);

    if (mode === "composite" && !existingSlide?.backgroundDataUrl && !options?.customBackgroundDataUrl) {
      setErrorMessage(
        "Saved background missing for this slide. Run a full generate or Redo background first.",
      );
      return;
    }

    const signal = beginGeneration();
    setIsGenerating(true);
    setRegeneratingSlideNumber(slideNumber);
    setErrorMessage("");
    setPartialPreviewUrl("");

    const applySlidePreview = (dataUrl: string, stage?: "background" | "composite" | "polish") => {
      if (mode === "composite" && stage === "background") return;
      setPartialPreviewUrl(dataUrl);
      setGeneratedSlides((prev) =>
        prev.map((item) =>
          item.slideNumber === slideNumber ? { ...item, dataUrl, renderVersion: Date.now() } : item,
        ),
      );
    };

    try {
      if (mode !== "composite") {
        assertCanGenerate(1);
      }
      const backgroundSceneCache: Record<string, string> = {};
      const existingAnchor = generatedSlides.find(
        (s) =>
          s.slideNumber === (effectiveStrategy.styleAnchorSlide || 1) &&
          (s.locale ?? activeLocale) === slideLocale,
      );

      const modeLabel =
        mode === "background"
          ? "background"
          : mode === "composite"
            ? "composite"
            : "full slide";

      const result = await generateSingleStoreSlide(
        effectiveSlide,
        effectiveStrategy,
        signal,
        backgroundSceneCache,
        scaleLockedTypography(
          resolveLockedTypographyForSlide(effectiveStrategy, effectiveSlide, slideLocale) ??
            (options?.typographyScale ? computeTypographyForSlide(effectiveSlide, slideLocale) : undefined),
          options?.typographyScale,
        ),
        existingAnchor?.dataUrl,
        (message) => setProgressLabel(`Regenerating ${modeLabel} (slide ${slideNumber}): ${message}`),
        (dataUrl, stage) => applySlidePreview(dataUrl, stage),
        {
          regenerateMode: mode,
          existingBackgroundDataUrl:
            mode === "composite"
              ? options?.customBackgroundDataUrl ?? existingSlide?.backgroundDataUrl
              : undefined,
          mockupColor:
            options?.mockupColor ??
            (mode === "composite" ? existingSlide?.mockupColor : undefined),
          mockupPose:
            options?.mockupPose ??
            (mode === "composite" ? existingSlide?.mockupPose : effectiveSlide.mockupPose),
          mockupAssetId:
            options?.mockupAssetId ??
            (mode === "composite"
              ? existingSlide?.mockupAssetId ?? effectiveSlide.mockupAssetId
              : effectiveSlide.mockupAssetId),
        },
        slideLocale,
      );

      const imageSource = result.dataUrl || result.imageUrl;
      if (!imageSource) {
        throw new Error(`Slide ${slideNumber} returned no image.`);
      }

      const resolved = await resolveDataUrl(imageSource);
      const backgroundDataUrl =
        typeof result.backgroundDataUrl === "string"
          ? result.backgroundDataUrl
          : options?.customBackgroundDataUrl ?? existingSlide?.backgroundDataUrl;

      const mockupColor = options?.mockupColor ?? existingSlide?.mockupColor;
      const mockupPose =
        options?.mockupPose ??
        (mode === "composite"
          ? existingSlide?.mockupPose ?? effectiveSlide.mockupPose
          : effectiveSlide.mockupPose ?? existingSlide?.mockupPose);
      const mockupAssetId =
        mode === "composite"
          ? normalizeMockupAssetId(
              options?.mockupAssetId ?? existingSlide?.mockupAssetId ?? effectiveSlide.mockupAssetId,
            )
          : normalizeMockupAssetId(options?.mockupAssetId ?? effectiveSlide.mockupAssetId ?? existingSlide?.mockupAssetId);

      setGeneratedSlides((prev) =>
        prev.map((item) =>
          item.slideNumber === slideNumber
            ? {
                ...item,
                role: effectiveSlide.role,
                asoBeat: effectiveSlide.asoBeat,
                headline: effectiveSlide.headline,
                subheadline: effectiveSlide.subheadline,
                dataUrl: resolved,
                prompt: String(result.revisedPrompt || result.prompt || ""),
                backgroundDataUrl,
                mockupColor,
                mockupPose,
                mockupAssetId,
                sourceDataUrl: mode !== "background" ? resolved : item.sourceDataUrl,
                editorState: undefined,
                renderVersion: Date.now(),
              }
            : item,
        ),
      );
      if (options?.slidePatch) {
        const applyPatchToStrategy = (strategyToPatch: StrategyBrief | null | undefined) => {
          if (!strategyToPatch) return strategyToPatch ?? null;
          return {
            ...strategyToPatch,
            slides: strategyToPatch.slides.map((item) =>
              item.slideNumber === slideNumber
                ? normalizeSlideEdit(item, options.slidePatch!, localeShots.length, {
                    strategy: strategyToPatch,
                    appProfile: profile,
                  })
                : item,
            ),
          };
        };
        setStoreStrategy((current) => applyPatchToStrategy(current) ?? effectiveStrategy);
        setStoreStrategiesByLocale((current) => ({
          ...current,
          [slideLocale]: applyPatchToStrategy(current[slideLocale] ?? effectiveStrategy) ?? effectiveStrategy,
        }));
      }
      if (mode !== "composite") {
        bumpUsage(1);
      }
      setProgressLabel(`Slide ${slideNumber} regenerated.`);
    } catch (error) {
      if (!isCancelledError(error)) {
        setErrorMessage(error instanceof Error ? error.message : "Slide regeneration failed.");
      }
    } finally {
      generationAbortRef.current = null;
      setIsGenerating(false);
      setRegeneratingSlideNumber(null);
      setPartialPreviewUrl("");
    }
  };

  const selectSlideVariant = (slideNumber: number, variantId: string) => {
    setGeneratedSlides((prev) =>
      prev.map((slide) => {
        if (slide.slideNumber !== slideNumber || !slide.variants?.length) {
          return slide;
        }
        const picked = slide.variants.find((v) => v.id === variantId);
        if (!picked) return slide;
        return {
          ...slide,
          selectedVariantId: variantId,
          dataUrl: picked.dataUrl,
          prompt: picked.prompt,
        };
      }),
    );
  };

  const updateGeneratedSlideFromEditor = (
    slideNumber: number,
    update: {
      dataUrl: string;
      editorState: SlideEditorState;
      headline: string;
      subheadline: string;
      applyLayoutToAll?: boolean;
    },
  ) => {
    setStoreStrategy((prevStrategy) => {
      if (!prevStrategy) return null;
      const nextStrategy = {
        ...prevStrategy,
        slides: prevStrategy.slides.map((s) => {
          if (s.slideNumber === slideNumber) {
            return {
              ...s,
              headline: update.headline,
              subheadline: update.subheadline,
            };
          }
          return s;
        }),
      };
      if (nextStrategy.locale) {
        setStoreStrategiesByLocale((current) => ({
          ...current,
          [nextStrategy.locale!]: nextStrategy,
        }));
      }
      return nextStrategy;
    });

    setGeneratedSlides((prev) => {
      const baseEditorState = update.editorState;
        return prev.map((slide) => {
          if (slide.slideNumber === slideNumber) {
            return {
              ...slide,
              dataUrl: update.dataUrl,
              sourceDataUrl: slide.sourceDataUrl ?? slide.dataUrl,
              editorState: baseEditorState,
              headline: update.headline,
              subheadline: update.subheadline,
              renderVersion: Date.now(),
            };
          }
          if (update.applyLayoutToAll) {
            const targetMockupAssetId = baseEditorState.device.mockupAssetId;

            const targetEditorState: SlideEditorState = {
              version: baseEditorState.version,
              textStyles: {
                ...(slide.editorState?.textStyles ?? {}),
                verb: { ...(slide.editorState?.textStyles?.verb ?? {}), ...baseEditorState.textStyles?.verb },
                descriptor: { ...(slide.editorState?.textStyles?.descriptor ?? {}), ...baseEditorState.textStyles?.descriptor },
                accent: { ...(slide.editorState?.textStyles?.accent ?? {}), ...baseEditorState.textStyles?.accent },
                sub: { ...(slide.editorState?.textStyles?.sub ?? {}), ...baseEditorState.textStyles?.sub },
                branding: { ...(slide.editorState?.textStyles?.branding ?? {}), ...baseEditorState.textStyles?.branding },
              },
              device: {
                ...(slide.editorState?.device ?? baseEditorState.device),
                scale: baseEditorState.device.scale,
                rotationDeg: baseEditorState.device.rotationDeg,
                xPct: baseEditorState.device.xPct,
                yPct: baseEditorState.device.yPct,
                frameColor: baseEditorState.device.frameColor,
                mockupAssetId: targetMockupAssetId,
              },
              overlays: {
                ...(slide.editorState?.overlays ?? {}),
                ...baseEditorState.overlays,
              },
              hiddenLayers: {
                ...(slide.editorState?.hiddenLayers ?? {}),
                ...baseEditorState.hiddenLayers,
              },
              overrides: slide.editorState?.overrides ?? {},
            };
            return {
              ...slide,
              editorState: targetEditorState,
              renderVersion: Date.now(),
            };
          }
          return slide;
        });
      });
      setProgressLabel(
        update.applyLayoutToAll
          ? `Slide ${slideNumber} and all other slides updated from live editor.`
          : `Slide ${slideNumber} updated from live editor.`
      );
  };

  const revertGeneratedSlideToOriginal = (slideNumber: number) => {
    const localeStrategy = storeStrategy;
    const plan = localeStrategy?.slides.find((s) => s.slideNumber === slideNumber);
    setGeneratedSlides((prev) =>
      prev.map((slide) => {
        if (slide.slideNumber !== slideNumber) return slide;
        if (!slide.sourceDataUrl) {
          return { ...slide, editorState: undefined, renderVersion: Date.now() };
        }
        return {
          ...slide,
          dataUrl: slide.sourceDataUrl,
          editorState: undefined,
          headline: plan?.headline ?? slide.headline,
          subheadline: plan?.subheadline ?? slide.subheadline,
          renderVersion: Date.now(),
        };
      }),
    );
    setProgressLabel(`Slide ${slideNumber} reverted to original.`);
  };

  const generateSocialPack = async () => {
    if (!profile || !socialStrategy) return;

    const activeStrategy = ensureSocialStrategyBrief(socialStrategy, profile, screenshots.length);
    if (!jsonEqual(activeStrategy, socialStrategy)) {
      setSocialStrategy(activeStrategy);
    }

    const signal = beginGeneration();
    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedSocialAssets([]);
    setStep("gallery");

    try {
      const reelsCount = activeStrategy.assets.filter(isSocialReelsAsset).length;
      assertCanGenerate(activeStrategy.assets.length + reelsCount);
      const assets: GeneratedSocialAsset[] = [];

      for (const asset of activeStrategy.assets) {
        if (signal.aborted) break;

        setPartialPreviewUrl("");
        setProgressLabel(
          `Generating ${asset.platform.replace("_", " ")} (${asset.assetNumber}/${activeStrategy.assets.length})...`,
        );

        const formData = new FormData();
        appendProfileFields(formData);
        appendSlideScreenshot(formData, asset.screenshotIndex);
        formData.append("strategy", JSON.stringify(activeStrategy));
        formData.append("asset", JSON.stringify(asset));

        const response = await fetch("/api/assets/generate-social-asset", { method: "POST", body: formData, signal });
        const result = await consumeAssetStream(
          response,
          {
            onStatus: (message) => setProgressLabel(`${asset.platform.replace("_", " ")}: ${message}`),
            onRevisedPrompt: () =>
              setProgressLabel(`${asset.platform.replace("_", " ")}: AI revised the background prompt...`),
            onPartial: (dataUrl) => setPartialPreviewUrl(dataUrl),
          },
          signal,
        );

        const imageSource = result.dataUrl || result.imageUrl;
        if (!imageSource) {
          throw new Error(`Asset ${asset.assetNumber} returned no image.`);
        }

        const dataUrl = await resolveDataUrl(imageSource);
        let videoDataUrl: string | undefined;

        if (isSocialReelsAsset(asset)) {
          setProgressLabel(
            `Rendering Reels video (${asset.assetNumber}/${activeStrategy.assets.length})...`,
          );
          const videoTemplate =
            asset.videoTemplate ?? (screenshots.length >= 2 ? "screenshot_reel" : "mood_teaser");
          const videoForm = new FormData();
          await appendProgrammaticVideoFields(videoForm, {
            screenshots,
            template: videoTemplate,
            headline: asset.hook || asset.headline,
            coverDataUrl: dataUrl,
            screenshotIntelligence: activeStrategy.screenshotIntelligence,
            width: 1080,
            height: 1920,
            postId: `social-${asset.assetNumber}`,
          });

          const videoRes = await fetch("/api/assets/generate-video", {
            method: "POST",
            body: videoForm,
            signal,
          });
          const videoJson = (await videoRes.json()) as { dataUrl?: string; error?: string };
          if (!videoRes.ok || !videoJson.dataUrl) {
            throw new Error(videoJson.error || `Reels video failed for asset ${asset.assetNumber}.`);
          }
          videoDataUrl = String(videoJson.dataUrl);
          bumpUsage(1);
        }

        assets.push({
          assetNumber: asset.assetNumber,
          platform: asset.platform,
          role: asset.role,
          headline: asset.headline,
          hook: asset.hook,
          caption: asset.caption,
          hashtags: asset.hashtags,
          dataUrl,
          prompt: String(result.revisedPrompt || result.prompt || ""),
          selectedVariantId: asset.selectedVariantId,
          usedScreenshot: asset.screenshotUsage !== "none",
          format: asset.format,
          videoTemplate: asset.videoTemplate,
          videoDataUrl,
        });
        bumpUsage(1);
        setPartialPreviewUrl("");
        setGeneratedSocialAssets([...assets]);
      }

      if (!signal.aborted) {
        setProgressLabel(assets.length ? "Social pack generated." : "Generation cancelled.");
      }
    } catch (error) {
      if (!isCancelledError(error)) {
        setErrorMessage(error instanceof Error ? error.message : "Social pack generation failed.");
      }
    } finally {
      generationAbortRef.current = null;
      setIsGenerating(false);
    }
  };

  const generateAutopilotCalendar = async () => {
    if (!profile || !autopilotStrategy) return;

    const signal = beginGeneration();
    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedCalendarPosts([]);
    setStep("gallery");

    const sessionEntries: Array<{
      day: number;
      platform: string;
      headline: string;
      hook: string;
      usedScreenshot: boolean;
    }> = [];

    try {
      assertCanGenerate(autopilotStrategy.posts.length);
      const posts: GeneratedCalendarPost[] = [];

      for (const post of autopilotStrategy.posts) {
        if (signal.aborted) break;

        setPartialPreviewUrl("");
        const formatLabel = post.format ?? "single";
        setProgressLabel(
          `Generating day ${post.day} (${formatLabel}) of ${autopilotStrategy.posts.length}...`,
        );

        const formData = new FormData();
        appendProfileFields(formData);
        appendSlideScreenshot(formData, post.screenshotIndex);
        formData.append("strategy", JSON.stringify(autopilotStrategy));
        formData.append("post", JSON.stringify(post));
        formData.append("sessionBrandMemory", formatSessionBrandMemory(sessionEntries));

        let dataUrl = "";
        let carouselDataUrls: string[] | undefined;
        let videoDataUrl: string | undefined;
        let prompt = "";

        if (post.format === "carousel") {
          const response = await fetch("/api/assets/generate-carousel", {
            method: "POST",
            body: formData,
            signal,
          });
          const carouselResult = await response.json();
          if (!response.ok) {
            throw new Error(carouselResult.error || `Day ${post.day} carousel failed.`);
          }
          carouselDataUrls = (carouselResult.slides as Array<{ dataUrl: string }>).map((s) => s.dataUrl);
          dataUrl = carouselDataUrls[0] ?? "";
          prompt = "carousel";
          bumpUsage(Math.max(1, carouselDataUrls.length));
        } else {
          const response = await fetch("/api/assets/generate-autopilot-post", {
            method: "POST",
            body: formData,
            signal,
          });
          const result = await consumeAssetStream(
            response,
            {
              onStatus: (message) => setProgressLabel(`Day ${post.day}: ${message}`),
              onRevisedPrompt: () =>
                setProgressLabel(`Day ${post.day}: AI revised the background prompt...`),
              onPartial: (partial) => setPartialPreviewUrl(partial),
            },
            signal,
          );

          const imageSource = result.dataUrl || result.imageUrl;
          if (!imageSource) {
            throw new Error(`Day ${post.day} returned no image.`);
          }
          dataUrl = await resolveDataUrl(imageSource);
          prompt = String(result.revisedPrompt || result.prompt || "");
          bumpUsage(1);

          if (post.format === "reels" && dataUrl) {
            setProgressLabel(`Day ${post.day}: rendering video (${post.videoTemplate ?? "mood_teaser"})...`);
            const isTwitter = post.platform === "twitter";
            const isVertical = post.format === "reels" || post.platform === "instagram_story";
            const videoTemplate =
              post.videoTemplate ?? (screenshots.length >= 2 ? "screenshot_reel" : "mood_teaser");
            const videoForm = new FormData();
            await appendProgrammaticVideoFields(videoForm, {
              screenshots,
              template: videoTemplate,
              headline: post.hook || post.headline,
              coverDataUrl: dataUrl,
              screenshotIntelligence: autopilotStrategy?.screenshotIntelligence,
              width: isTwitter ? 1920 : 1080,
              height: isTwitter ? 1080 : isVertical ? 1920 : 1080,
              postId: postIdsByDay[post.day] ?? `day-${post.day}`,
            });

            const videoRes = await fetch("/api/assets/generate-video", {
              method: "POST",
              body: videoForm,
              signal,
            });
            const videoJson = await videoRes.json();
            if (videoRes.ok && videoJson.dataUrl) {
              videoDataUrl = String(videoJson.dataUrl);
            }
          }
        }

        const postId = postIdsByDay[post.day];

        const generated: GeneratedCalendarPost = {
          day: post.day,
          scheduledDate: addDaysToDate(autopilotStrategy.startDate, post.day - 1),
          scheduledTime: post.scheduledTime,
          platform: post.platform,
          role: post.role,
          format: post.format,
          campaignId: autopilotCampaignId ?? undefined,
          postId,
          headline: post.headline,
          hook: post.hook,
          caption: post.caption,
          hashtags: post.hashtags,
          screenshotRationale: post.screenshotRationale,
          dataUrl,
          carouselDataUrls,
          videoDataUrl,
          prompt,
          selectedVariantId: post.selectedVariantId,
          usedScreenshot: post.screenshotUsage !== "none",
        };

        if (autopilotCampaignId) {
          if (carouselDataUrls?.length) {
            for (let i = 0; i < carouselDataUrls.length; i++) {
              await persistCampaignAsset(autopilotCampaignId, post.day, carouselDataUrls[i], {
                kind: "image",
                sortOrder: i,
              });
            }
          } else {
            await persistCampaignAsset(autopilotCampaignId, post.day, dataUrl, { kind: "image", sortOrder: 0 });
            if (videoDataUrl) {
              await persistCampaignAsset(autopilotCampaignId, post.day, videoDataUrl, {
                kind: "video",
                sortOrder: 1,
                mimeType: "video/mp4",
              });
            }
          }
        }

        posts.push(generated);
        setPartialPreviewUrl("");
        sessionEntries.push({
          day: post.day,
          platform: post.platform,
          headline: post.headline,
          hook: post.hook,
          usedScreenshot: post.screenshotUsage !== "none",
        });
        setGeneratedCalendarPosts([...posts]);
      }

      if (!signal.aborted && posts.length) {
        saveBrandMemory({
          appName: profile.appName,
          visualTheme: autopilotStrategy.visualTheme,
          brandVoice: autopilotStrategy.brandVoice,
          recentPosts: posts.map((post) => ({
            day: post.day,
            platform: post.platform,
            headline: post.headline,
            hook: post.hook,
            usedScreenshot: sessionEntries.find((entry) => entry.day === post.day)?.usedScreenshot ?? false,
          })),
        });
        setProgressLabel(`${posts.length}-day calendar generated. Brand memory saved.`);
      } else if (!signal.aborted) {
        setProgressLabel("Generation cancelled.");
      }
    } catch (error) {
      if (!isCancelledError(error)) {
        setErrorMessage(error instanceof Error ? error.message : "Autopilot calendar generation failed.");
      }
    } finally {
      generationAbortRef.current = null;
      setIsGenerating(false);
    }
  };

  const generateCampaign = (options?: { variantsPerSlide?: number }) => {
    if (campaignType === "app_store") void generateStoreSet(options);
    else if (campaignType === "social_launch") void generateSocialPack();
    else void generateAutopilotCalendar();
  };

  const resetCampaign = () => {
    clearCampaignSession();
    setStep("setup");
    setProfile(null);
    setScreenshots([]);
    setScreenshotsByLocale({});
    setStoreStrategy(null);
    setStoreStrategiesByLocale({});
    setActiveLocale("en");
    setAiStoreStrategy(null);
    setSocialStrategy(null);
    setAiSocialStrategy(null);
    setAutopilotStrategy(null);
    setAiAutopilotStrategy(null);
    setCoherenceAudit(null);
    setLocaleMismatchCount(0);
    setAutopilotCampaignId(null);
    setPostIdsByDay({});
    setGeneratedSlides([]);
    setGeneratedSocialAssets([]);
    setGeneratedCalendarPosts([]);
    setCustomBackgroundsBySlide({});
    setErrorMessage("");
    setProgressLabel("");
  };

  const goBackToSetup = () => {
    setStep("setup");
    setErrorMessage("");
  };

  const resetStrategyToAi = () => {
    if (campaignType === "app_store" && aiStoreStrategy) {
      const locale = aiStoreStrategy.locale || activeLocale;
      const next = { ...aiStoreStrategy, locale };
      setStoreStrategy(next);
      setStoreStrategiesByLocale((current) => ({ ...current, [locale]: next }));
    }
    if (campaignType === "social_launch" && aiSocialStrategy) setSocialStrategy(aiSocialStrategy);
    if (campaignType === "marketing_autopilot" && aiAutopilotStrategy) setAutopilotStrategy(aiAutopilotStrategy);
  };

  const goToStrategy = () => {
    if (storeStrategy || socialStrategy || autopilotStrategy) {
      setStep("strategy");
    }
  };

  const goToGallery = () => {
    if (generatedSlides.length || generatedSocialAssets.length || generatedCalendarPosts.length) {
      setStep("gallery");
    }
  };

  const switchActiveLocale = (locale: LocaleCode) => {
    setActiveLocale(locale);
    const next = storeStrategiesByLocale[locale];
    if (next) {
      setStoreStrategy(next);
    }
    const localeShots = getScreenshotsForLocale(screenshotsByLocale, locale, screenshots);
    if (localeShots.length) {
      setScreenshots(localeShots);
    }
  };

  const updateStoreStrategy = (strategy: StrategyBrief) => {
    const locale = strategy.locale || activeLocale;
    const next = { ...strategy, locale };
    setStoreStrategy(next);
    setStoreStrategiesByLocale((current) => ({ ...current, [locale]: next }));
  };

  return {
    step,
    campaignType,
    profile,
    screenshots,
    screenshotsByLocale,
    storeStrategy,
    storeStrategiesByLocale,
    activeLocale,
    socialStrategy,
    autopilotStrategy,
    screenshotPreviews,
    customBackgroundsForActiveLocale,
    hasEdits,
    generatedSlides,
    generatedSocialAssets,
    generatedCalendarPosts,
    errorMessage,
    isPlanning,
    isGenerating,
    progressLabel,
    partialPreviewUrl,
    regeneratingSlideNumber,
    coherenceAudit,
    isAuditing,
    localeMismatchCount,
    refreshCoherenceAudit,
    usageRefreshKey,
    createStrategy,
    generateCampaign,
    cancelGeneration,
    resetCampaign,
    goBackToSetup,
    goToStrategy,
    goToGallery,
    setStoreStrategy: updateStoreStrategy,
    switchActiveLocale,
    setCustomSlideBackground,
    setSocialStrategy,
    setAutopilotStrategy,
    resetStrategyToAi,
    regenerateStoreSlide,
    selectSlideVariant,
    updateGeneratedSlideFromEditor,
    revertGeneratedSlideToOriginal,
  };
}
