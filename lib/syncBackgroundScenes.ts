import type { BackgroundScene, StoreSlidePlan } from "@/lib/campaignTypes";

export function normalizeSharedSlideNumbers(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => (typeof value === "number" ? value : Number.parseInt(String(value), 10)))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5),
    ),
  ].sort((a, b) => a - b);
}

export function sceneSharesSlide(scene: BackgroundScene, slideNumber: number) {
  return normalizeSharedSlideNumbers(scene.sharedBySlides).includes(slideNumber);
}

export function syncSlidesWithScenes(
  backgroundScenes: BackgroundScene[],
  slides: StoreSlidePlan[],
): StoreSlidePlan[] {
  const normalizedScenes = backgroundScenes.map((scene) => ({
    ...scene,
    sharedBySlides: normalizeSharedSlideNumbers(scene.sharedBySlides),
  }));

  return slides.map((slide) => {
    const scene = normalizedScenes.find((item) => sceneSharesSlide(item, slide.slideNumber));
    return {
      ...slide,
      backgroundSceneId: scene?.id ?? null,
    };
  });
}

export function toggleSceneSlideAssignment(
  backgroundScenes: BackgroundScene[],
  slides: StoreSlidePlan[],
  sceneId: string,
  slideNumber: number,
  checked: boolean,
): { backgroundScenes: BackgroundScene[]; slides: StoreSlidePlan[] } {
  const normalizedScenes = backgroundScenes.map((scene) => ({
    ...scene,
    sharedBySlides: normalizeSharedSlideNumbers(scene.sharedBySlides),
  }));

  let nextScenes: BackgroundScene[];

  if (checked) {
    nextScenes = normalizedScenes.map((scene) => {
      const withoutSlide = scene.sharedBySlides.filter((n) => n !== slideNumber);
      if (scene.id === sceneId) {
        return {
          ...scene,
          sharedBySlides: [...withoutSlide, slideNumber].sort((a, b) => a - b),
        };
      }
      return { ...scene, sharedBySlides: withoutSlide };
    });
  } else {
    nextScenes = normalizedScenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        sharedBySlides: scene.sharedBySlides.filter((n) => n !== slideNumber),
      };
    });
  }

  return {
    backgroundScenes: nextScenes,
    slides: syncSlidesWithScenes(nextScenes, slides),
  };
}

export function assignSlideToBackgroundScene(
  backgroundScenes: BackgroundScene[],
  slides: StoreSlidePlan[],
  slideNumber: number,
  sceneId: string | null,
): { backgroundScenes: BackgroundScene[]; slides: StoreSlidePlan[] } {
  if (!sceneId) {
    const nextScenes = backgroundScenes.map((scene) => ({
      ...scene,
      sharedBySlides: normalizeSharedSlideNumbers(scene.sharedBySlides).filter((n) => n !== slideNumber),
    }));
    return {
      backgroundScenes: nextScenes,
      slides: syncSlidesWithScenes(nextScenes, slides),
    };
  }

  return toggleSceneSlideAssignment(backgroundScenes, slides, sceneId, slideNumber, true);
}
