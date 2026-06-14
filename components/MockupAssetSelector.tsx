"use client";

import {
  MOCKUP_ASSET_OPTIONS,
  normalizeMockupAssetId,
  isSceneMockup,
  type MockupAssetId,
} from "@/lib/assetMockup";

type MockupAssetSelectorProps = {
  value?: MockupAssetId | null;
  disabled?: boolean;
  onChange: (value: MockupAssetId) => void;
};

export function MockupAssetSelector({ value, disabled, onChange }: MockupAssetSelectorProps) {
  const selected = normalizeMockupAssetId(value);
  const sceneSelected = isSceneMockup(selected);

  return (
    <div className="mockup-asset-selector">
      <label className="field field-wide">
        <span>Mockup template</span>
        <select
          value={selected}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as MockupAssetId)}
        >
          {MOCKUP_ASSET_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {option.kind === "scene" ? " (lifestyle scene)" : ""}
            </option>
          ))}
        </select>
      </label>
      {sceneSelected ? (
        <p className="pf-form-section-hint">
          Lifestyle scene mockups use the baked PSD background instead of AI generation. Pose controls
          are disabled — screenshot is warped into the fixed screen area.
        </p>
      ) : null}
    </div>
  );
}

export function MockupAssetPreviewThumb({ assetId }: { assetId: MockupAssetId }) {
  const id = normalizeMockupAssetId(assetId);
  const option = MOCKUP_ASSET_OPTIONS.find((row) => row.id === id);
  if (!option) return null;

  return (
    <img
      className="mockup-asset-thumb"
      src={`/mockups/${id}.png`}
      alt={option.label}
      loading="lazy"
    />
  );
}
