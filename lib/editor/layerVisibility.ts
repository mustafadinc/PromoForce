import type { SlideEditorHiddenLayer, SlideEditorHiddenLayers, SlideEditorState } from "@/lib/campaignTypes";
import { TEXT_BLOCK_LABELS } from "@/lib/editor/textBlockStyles";

export const HIDDEN_LAYER_LABELS: Record<SlideEditorHiddenLayer, string> = {
  ...TEXT_BLOCK_LABELS,
  device: "Phone mockup",
  featurePills: "Feature pills",
  socialProof: "Social proof card",
};

export function isLayerHidden(
  hiddenLayers: SlideEditorHiddenLayers | undefined,
  layer: SlideEditorHiddenLayer,
): boolean {
  return Boolean(hiddenLayers?.[layer]);
}

export function listHiddenLayers(hiddenLayers: SlideEditorHiddenLayers | undefined): SlideEditorHiddenLayer[] {
  if (!hiddenLayers) return [];
  return (Object.keys(hiddenLayers) as SlideEditorHiddenLayer[]).filter((key) => hiddenLayers[key]);
}

export function setLayerHidden(
  state: SlideEditorState,
  layer: SlideEditorHiddenLayer,
  hidden: boolean,
): SlideEditorState {
  const next = { ...(state.hiddenLayers ?? {}) };
  if (hidden) {
    next[layer] = true;
  } else {
    delete next[layer];
  }
  return {
    ...state,
    hiddenLayers: Object.keys(next).length ? next : undefined,
  };
}
