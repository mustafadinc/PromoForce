"use client";

import {
  DEVICE_MOCKUP_ASSET_OPTIONS,
  IPHONE_16_SCENE_OPTIONS,
  MOCKUP_ASSET_OPTIONS,
  SCENE_MOCKUP_ASSET_OPTIONS,
  normalizeMockupAssetId,
  type MockupAssetId,
} from "@/lib/assetMockup";

type MockupAssetSelectorProps = {
  value?: MockupAssetId | null;
  disabled?: boolean;
  onChange: (value: MockupAssetId) => void;
  /** When true, show 3D device templates only (legacy export controls). */
  deviceOnly?: boolean;
};

export function MockupAssetSelector({
  value,
  disabled,
  onChange,
  deviceOnly = false,
}: MockupAssetSelectorProps) {
  const selected = normalizeMockupAssetId(value);
  const legacyScenes = SCENE_MOCKUP_ASSET_OPTIONS.filter(
    (option) => !option.id.startsWith("iphone-16-md942-"),
  );

  return (
    <div className="mockup-asset-selector">
      <label className="field field-wide">
        <span>Mockup template</span>
        <select
          value={selected}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as MockupAssetId)}
        >
          {!deviceOnly ? (
            <optgroup label="iPhone 16 — transparent on AI background (5 poses)">
              {IPHONE_16_SCENE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {!deviceOnly && legacyScenes.length ? (
            <optgroup label="Lifestyle scenes">
              {legacyScenes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={deviceOnly ? "3D device showcase" : "3D device on AI background"}>
            {DEVICE_MOCKUP_ASSET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <p className="pf-form-section-hint">
        {deviceOnly
          ? "Use Angle = Front (flat) for the clean gray device mockup; 3D angles use the showcase device."
          : "iPhone 16 templates are cut-out device frames — AI generates the background at export. One pose per slide by default."}
      </p>
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
      src={
        option.kind === "scene"
          ? `/mockups/${id}-device.png`
          : `/mockups/${id}.png`
      }
      alt={option.label}
      loading="lazy"
    />
  );
}
