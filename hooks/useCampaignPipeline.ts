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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { resolveLockedTypographyForSlide } from "@/lib/resolveLockedTypography";
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
  SocialStrategyBrief,
  StoreSlidePlan,
  StoreSlideRegenerateMode,
  StoreSlideRegenerateOptions,
  StrategyBrief,
  UploadedScreenshot,
} from "@/lib/campaignTypes";
import { isSocialReelsAsset } from "@/lib/campaignTypes";
import { ensureSocialStrategyBrief } from "@/lib/socialStrategyNormalize";

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
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
  const [storeStrategy, setStoreStrategy] = useState<StrategyBrief | null>(null);
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
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [partialPreviewUrl, setPartialPreviewUrl] = useState("");
  const [regeneratingSlideNumber, setRegeneratingSlideNumber] = useState<number | null>(null);
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const generationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void (async () => {
      const restored = await loadCampaignSession();
      const urlPhase = readPhaseFromLocation(window.location.search);
      const urlCampaign = readCampaignTypeFromLocation(window.location.search);

      if (restored) {
        const { session, screenshots: restoredScreenshots } = restored;
        setCampaignType(urlCampaign ?? session.campaignType);
        setProfile(session.profile);
        setScreenshots(restoredScreenshots);
        setStoreStrategy(session.storeStrategy);
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
        storeStrategy,
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
      storeStrategy,
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

  const appendProfileFields = (formData: FormData) => {
    if (!profile) return;

    formData.append("appName", profile.appName);
    formData.append("category", profile.category);
    formData.append("description", profile.description);
    formData.append("targetAudience", profile.targetAudience);
  };

  const appendSlideScreenshot = (formData: FormData, screenshotIndex: number | null) => {
    screenshots.forEach((item) => formData.append("screenshots", item.file));
    if (screenshotIndex === null || screenshotIndex < 0) return;
    const shot = screenshots[screenshotIndex];
    if (shot) formData.append("screenshot", shot.file);
  };

  const appendFormBasics = (formData: FormData) => {
    appendProfileFields(formData);
    screenshots.forEach((item) => formData.append("screenshots", item.file));
  };

  const createStrategy = async (
    nextCampaignType: CampaignType,
    nextProfile: AppProfile,
    nextScreenshots: UploadedScreenshot[],
    autopilotConfig?: AutopilotConfig,
  ) => {
    setIsPlanning(true);
    setErrorMessage("");
    setCampaignType(nextCampaignType);
    setProfile(nextProfile);
    setScreenshots(nextScreenshots);
    setGeneratedSlides([]);
    setGeneratedSocialAssets([]);
    setGeneratedCalendarPosts([]);
    setStoreStrategy(null);
    setAiStoreStrategy(null);
    setSocialStrategy(null);
    setAiSocialStrategy(null);
    setAutopilotStrategy(null);
    setAiAutopilotStrategy(null);

    try {
      const formData = new FormData();
      formData.append("appName", nextProfile.appName);
      formData.append("category", nextProfile.category);
      formData.append("description", nextProfile.description);
      formData.append("targetAudience", nextProfile.targetAudience);
      nextScreenshots.forEach((item) => formData.append("screenshots", item.file));

      let endpoint = "/api/strategy/generate";
      if (nextCampaignType === "social_launch") {
        endpoint = "/api/strategy/generate-social";
        formData.append("performanceContext", formatPerformanceForPrompt(nextProfile.appName));
      }
      if (nextCampaignType === "marketing_autopilot") {
        endpoint = "/api/strategy/generate-autopilot";
        formData.append("duration", String(autopilotConfig?.duration || 7));
        formData.append("startDate", autopilotConfig?.startDate || new Date().toISOString().slice(0, 10));
        formData.append("performanceContext", formatPerformanceForPrompt(nextProfile.appName));

        const brandMemory = loadBrandMemory(nextProfile.appName);
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
        setStoreStrategy(result.strategy);
        setAiStoreStrategy(result.strategy);
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
    },
  ) => {
    const formData = new FormData();
    appendProfileFields(formData);
    appendSlideScreenshot(formData, slide.screenshotIndex);
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
    if (!profile || !storeStrategy) return;

    const variantsPerSlide = Math.min(3, Math.max(1, options?.variantsPerSlide ?? 1));
    const signal = beginGeneration();
    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedSlides([]);
    setStep("gallery");

    const slides: GeneratedSlide[] = [];
    const backgroundSceneCache: Record<string, string> = {};
    let lockedTypography: LockedTypography | undefined;
    let styleReferenceDataUrl: string | undefined;

    try {
      const totalCalls = storeStrategy.slides.length * variantsPerSlide;
      assertCanGenerate(totalCalls);

      for (const slide of storeStrategy.slides) {
        if (signal.aborted) break;

        setPartialPreviewUrl("");
        setProgressLabel(`Generating slide ${slide.slideNumber} of ${storeStrategy.slides.length}...`);

        const variantResults: GeneratedSlideVariant[] = [];
        let lastGenerationResult: Awaited<ReturnType<typeof generateSingleStoreSlide>> | null = null;

        for (let variantIndex = 0; variantIndex < variantsPerSlide; variantIndex += 1) {
          if (signal.aborted) break;

          const slideLockedTypography =
            lockedTypography ?? resolveLockedTypographyForSlide(storeStrategy, slide);

          const result = await generateSingleStoreSlide(
            slide,
            storeStrategy,
            signal,
            backgroundSceneCache,
            slideLockedTypography,
            styleReferenceDataUrl,
            (message) =>
              setProgressLabel(
                variantsPerSlide > 1
                  ? `Slide ${slide.slideNumber} v${variantIndex + 1}: ${message}`
                  : `Slide ${slide.slideNumber}: ${message}`,
              ),
            (dataUrl) => setPartialPreviewUrl(dataUrl),
          );
          lastGenerationResult = result;

          const imageSource = result.dataUrl || result.imageUrl;
          if (!imageSource) {
            throw new Error(`Slide ${slide.slideNumber} variant ${variantIndex + 1} returned no image.`);
          }

          const resolved = await resolveDataUrl(imageSource);

          if (
            slide.backgroundSceneId &&
            typeof result.backgroundDataUrl === "string" &&
            !backgroundSceneCache[slide.backgroundSceneId]
          ) {
            const rawBackground = result.backgroundDataUrl.split(",")[1];
            if (rawBackground) {
              backgroundSceneCache[slide.backgroundSceneId] = rawBackground;
            }
          }

          if (slide.slideNumber === (storeStrategy.styleAnchorSlide || 1)) {
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
          bumpUsage(1);
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
          headline: slide.headline,
          subheadline: slide.subheadline,
          dataUrl: selected.dataUrl,
          prompt: selected.prompt,
          backgroundDataUrl,
          variants: variantResults.length > 1 ? variantResults : undefined,
          selectedVariantId: selected.id,
        });
        setPartialPreviewUrl("");
        setGeneratedSlides([...slides]);
      }

      if (!signal.aborted) {
        setProgressLabel(slides.length ? "All slides generated." : "Generation cancelled.");
      }
    } catch (error) {
      if (!isCancelledError(error)) {
        const partial = slides.length;
        const total = storeStrategy.slides.length;
        const base = error instanceof Error ? error.message : "Store set generation failed.";
        setErrorMessage(
          partial > 0 && partial < total
            ? `${base} (${partial} of ${total} slides were saved — retry generation for the rest.)`
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

    const slide = storeStrategy.slides.find((s) => s.slideNumber === slideNumber);
    if (!slide) return;

    const existingSlide = generatedSlides.find((s) => s.slideNumber === slideNumber);

    if (mode === "composite" && !existingSlide?.backgroundDataUrl) {
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
      assertCanGenerate(1);
      const backgroundSceneCache: Record<string, string> = {};
      const existingAnchor = generatedSlides.find(
        (s) => s.slideNumber === (storeStrategy.styleAnchorSlide || 1),
      );

      const modeLabel =
        mode === "background"
          ? "background"
          : mode === "composite"
            ? "composite"
            : "full slide";

      const result = await generateSingleStoreSlide(
        slide,
        storeStrategy,
        signal,
        backgroundSceneCache,
        resolveLockedTypographyForSlide(storeStrategy, slide),
        existingAnchor?.dataUrl,
        (message) => setProgressLabel(`Regenerating ${modeLabel} (slide ${slideNumber}): ${message}`),
        (dataUrl, stage) => applySlidePreview(dataUrl, stage),
        {
          regenerateMode: mode,
          existingBackgroundDataUrl:
            mode === "composite" ? existingSlide?.backgroundDataUrl : undefined,
          mockupColor:
            mode === "composite"
              ? options?.mockupColor ?? existingSlide?.mockupColor
              : undefined,
        },
      );

      const imageSource = result.dataUrl || result.imageUrl;
      if (!imageSource) {
        throw new Error(`Slide ${slideNumber} returned no image.`);
      }

      const resolved = await resolveDataUrl(imageSource);
      const backgroundDataUrl =
        typeof result.backgroundDataUrl === "string"
          ? result.backgroundDataUrl
          : existingSlide?.backgroundDataUrl;

      const mockupColor =
        mode === "composite" ? options?.mockupColor ?? existingSlide?.mockupColor : existingSlide?.mockupColor;

      setGeneratedSlides((prev) =>
        prev.map((item) =>
          item.slideNumber === slideNumber
            ? {
                ...item,
                dataUrl: resolved,
                prompt: String(result.revisedPrompt || result.prompt || ""),
                backgroundDataUrl,
                mockupColor,
                renderVersion: Date.now(),
              }
            : item,
        ),
      );
      bumpUsage(1);
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
    setStoreStrategy(null);
    setAiStoreStrategy(null);
    setSocialStrategy(null);
    setAiSocialStrategy(null);
    setAutopilotStrategy(null);
    setAiAutopilotStrategy(null);
    setAutopilotCampaignId(null);
    setPostIdsByDay({});
    setGeneratedSlides([]);
    setGeneratedSocialAssets([]);
    setGeneratedCalendarPosts([]);
    setErrorMessage("");
    setProgressLabel("");
  };

  const goBackToSetup = () => {
    setStep("setup");
    setErrorMessage("");
  };

  const resetStrategyToAi = () => {
    if (campaignType === "app_store" && aiStoreStrategy) setStoreStrategy(aiStoreStrategy);
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

  return {
    step,
    campaignType,
    profile,
    screenshots,
    storeStrategy,
    socialStrategy,
    autopilotStrategy,
    screenshotPreviews,
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
    usageRefreshKey,
    createStrategy,
    generateCampaign,
    cancelGeneration,
    resetCampaign,
    goBackToSetup,
    goToStrategy,
    goToGallery,
    setStoreStrategy,
    setSocialStrategy,
    setAutopilotStrategy,
    resetStrategyToAi,
    regenerateStoreSlide,
    selectSlideVariant,
  };
}
