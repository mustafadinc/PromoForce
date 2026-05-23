"use client";

import { consumeAssetStream, GenerationCancelledError } from "@/lib/consumeAssetStream";
import { useMemo, useRef, useState } from "react";
import { formatPerformanceForPrompt } from "@/lib/performanceMemory";
import { canGenerate, recordGenerations } from "@/lib/usageLimits";
import {
  formatSessionBrandMemory,
  loadBrandMemory,
  saveBrandMemory,
} from "@/lib/brandMemory";
import { addDaysToDate } from "@/lib/scheduleUtils";
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
  StrategyBrief,
  UploadedScreenshot,
} from "@/lib/campaignTypes";

type CampaignStep = "setup" | "strategy" | "gallery";

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
  const [step, setStep] = useState<CampaignStep>("setup");
  const [campaignType, setCampaignType] = useState<CampaignType>("app_store");
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [storeStrategy, setStoreStrategy] = useState<StrategyBrief | null>(null);
  const [aiStoreStrategy, setAiStoreStrategy] = useState<StrategyBrief | null>(null);
  const [socialStrategy, setSocialStrategy] = useState<SocialStrategyBrief | null>(null);
  const [aiSocialStrategy, setAiSocialStrategy] = useState<SocialStrategyBrief | null>(null);
  const [autopilotStrategy, setAutopilotStrategy] = useState<AutopilotStrategyBrief | null>(null);
  const [aiAutopilotStrategy, setAiAutopilotStrategy] = useState<AutopilotStrategyBrief | null>(null);
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [generatedSocialAssets, setGeneratedSocialAssets] = useState<GeneratedSocialAsset[]>([]);
  const [generatedCalendarPosts, setGeneratedCalendarPosts] = useState<GeneratedCalendarPost[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [partialPreviewUrl, setPartialPreviewUrl] = useState("");
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const generationAbortRef = useRef<AbortController | null>(null);

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

  const appendFormBasics = (formData: FormData) => {
    if (!profile) return;

    formData.append("appName", profile.appName);
    formData.append("category", profile.category);
    formData.append("description", profile.description);
    formData.append("targetAudience", profile.targetAudience);
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
      }

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
    onPartial: (dataUrl: string) => void,
    options?: {
      regenerateMode?: StoreSlideRegenerateMode;
      existingBackgroundDataUrl?: string;
    },
  ) => {
    const formData = new FormData();
    appendFormBasics(formData);
    formData.append("strategy", JSON.stringify(strategy));
    formData.append("slide", JSON.stringify(slide));
    formData.append("backgroundSceneCache", JSON.stringify(backgroundSceneCache));
    if (lockedTypography) {
      formData.append("lockedTypography", JSON.stringify(lockedTypography));
    }
    if (styleReferenceDataUrl) {
      const raw = styleReferenceDataUrl.includes(",") ? styleReferenceDataUrl.split(",")[1] : styleReferenceDataUrl;
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

    const response = await fetch("/api/assets/generate-slide", { method: "POST", body: formData, signal });
    return consumeAssetStream(
      response,
      {
        onStatus: onProgress,
        onRevisedPrompt: () => onProgress(`Slide ${slide.slideNumber}: AI revised the background prompt...`),
        onPartial,
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

    try {
      const totalCalls = storeStrategy.slides.length * variantsPerSlide;
      assertCanGenerate(totalCalls);
      const slides: GeneratedSlide[] = [];
      const backgroundSceneCache: Record<string, string> = {};
      let lockedTypography: LockedTypography | undefined;
      let styleReferenceDataUrl: string | undefined;

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
        setErrorMessage(error instanceof Error ? error.message : "Store set generation failed.");
      }
    } finally {
      generationAbortRef.current = null;
      setIsGenerating(false);
    }
  };

  const regenerateStoreSlide = async (
    slideNumber: number,
    mode: StoreSlideRegenerateMode = "full",
  ) => {
    if (!profile || !storeStrategy) return;

    const slide = storeStrategy.slides.find((s) => s.slideNumber === slideNumber);
    if (!slide) return;

    const existingSlide = generatedSlides.find((s) => s.slideNumber === slideNumber);

    const signal = beginGeneration();
    setIsGenerating(true);
    setErrorMessage("");

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
        (dataUrl) => setPartialPreviewUrl(dataUrl),
        {
          regenerateMode: mode,
          existingBackgroundDataUrl:
            mode === "composite" ? existingSlide?.backgroundDataUrl : undefined,
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

      setGeneratedSlides((prev) =>
        prev.map((item) =>
          item.slideNumber === slideNumber
            ? {
                ...item,
                dataUrl: resolved,
                prompt: String(result.revisedPrompt || result.prompt || ""),
                backgroundDataUrl,
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

    const signal = beginGeneration();
    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedSocialAssets([]);
    setStep("gallery");

    try {
      assertCanGenerate(socialStrategy.assets.length);
      const assets: GeneratedSocialAsset[] = [];

      for (const asset of socialStrategy.assets) {
        if (signal.aborted) break;

        setPartialPreviewUrl("");
        setProgressLabel(
          `Generating ${asset.platform.replace("_", " ")} (${asset.assetNumber}/${socialStrategy.assets.length})...`,
        );

        const formData = new FormData();
        appendFormBasics(formData);
        formData.append("strategy", JSON.stringify(socialStrategy));
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

        assets.push({
          assetNumber: asset.assetNumber,
          platform: asset.platform,
          role: asset.role,
          headline: asset.headline,
          hook: asset.hook,
          caption: asset.caption,
          hashtags: asset.hashtags,
          dataUrl: await resolveDataUrl(imageSource),
          prompt: String(result.revisedPrompt || result.prompt || ""),
          selectedVariantId: asset.selectedVariantId,
          usedScreenshot: asset.screenshotUsage !== "none",
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
        setProgressLabel(`Generating day ${post.day} of ${autopilotStrategy.posts.length}...`);

        const formData = new FormData();
        appendFormBasics(formData);
        formData.append("strategy", JSON.stringify(autopilotStrategy));
        formData.append("post", JSON.stringify(post));
        formData.append("sessionBrandMemory", formatSessionBrandMemory(sessionEntries));

        const response = await fetch("/api/assets/generate-autopilot-post", {
          method: "POST",
          body: formData,
          signal,
        });
        const result = await consumeAssetStream(
          response,
          {
            onStatus: (message) => setProgressLabel(`Day ${post.day}: ${message}`),
            onRevisedPrompt: () => setProgressLabel(`Day ${post.day}: AI revised the background prompt...`),
            onPartial: (dataUrl) => setPartialPreviewUrl(dataUrl),
          },
          signal,
        );

        const imageSource = result.dataUrl || result.imageUrl;
        if (!imageSource) {
          throw new Error(`Day ${post.day} returned no image.`);
        }

        const generated: GeneratedCalendarPost = {
          day: post.day,
          scheduledDate: addDaysToDate(autopilotStrategy.startDate, post.day - 1),
          scheduledTime: post.scheduledTime,
          platform: post.platform,
          role: post.role,
          headline: post.headline,
          hook: post.hook,
          caption: post.caption,
          hashtags: post.hashtags,
          screenshotRationale: post.screenshotRationale,
          dataUrl: await resolveDataUrl(imageSource),
          prompt: String(result.revisedPrompt || result.prompt || ""),
          selectedVariantId: post.selectedVariantId,
          usedScreenshot: post.screenshotUsage !== "none",
        };

        posts.push(generated);
        bumpUsage(1);
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
    setStep("setup");
    setProfile(null);
    setScreenshots([]);
    setStoreStrategy(null);
    setAiStoreStrategy(null);
    setSocialStrategy(null);
    setAiSocialStrategy(null);
    setAutopilotStrategy(null);
    setAiAutopilotStrategy(null);
    setGeneratedSlides([]);
    setGeneratedSocialAssets([]);
    setGeneratedCalendarPosts([]);
    setErrorMessage("");
    setProgressLabel("");
  };

  const goBackToSetup = () => {
    setStep("setup");
    setStoreStrategy(null);
    setAiStoreStrategy(null);
    setSocialStrategy(null);
    setAiSocialStrategy(null);
    setAutopilotStrategy(null);
    setAiAutopilotStrategy(null);
    setGeneratedSlides([]);
    setGeneratedSocialAssets([]);
    setGeneratedCalendarPosts([]);
    setErrorMessage("");
  };

  const resetStrategyToAi = () => {
    if (campaignType === "app_store" && aiStoreStrategy) setStoreStrategy(aiStoreStrategy);
    if (campaignType === "social_launch" && aiSocialStrategy) setSocialStrategy(aiSocialStrategy);
    if (campaignType === "marketing_autopilot" && aiAutopilotStrategy) setAutopilotStrategy(aiAutopilotStrategy);
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
    usageRefreshKey,
    createStrategy,
    generateCampaign,
    cancelGeneration,
    resetCampaign,
    goBackToSetup,
    setStoreStrategy,
    setSocialStrategy,
    setAutopilotStrategy,
    resetStrategyToAi,
    regenerateStoreSlide,
    selectSlideVariant,
  };
}
