"use client";

import { CopyVariantPicker } from "@/components/CopyVariantPicker";
import type { CopyVariantId, SocialAssetPlan, SocialStrategyBrief, ScreenshotUsage } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { selectCopyVariant, updateCopyField } from "@/lib/copyVariants";
import { normalizeSocialAssetEdit, screenshotUsageOptions } from "@/lib/normalizeSocialAssetEdit";

type ScreenshotPreview = {
  index: number;
  previewUrl: string;
};

type SocialStrategyPreviewProps = {
  strategy: SocialStrategyBrief | null;
  screenshotPreviews: ScreenshotPreview[];
  isGenerating: boolean;
  hasEdits: boolean;
  onStrategyChange: (strategy: SocialStrategyBrief) => void;
  onResetStrategy: () => void;
  onGenerate: () => void;
  onBack: () => void;
  onCancel?: () => void;
};

const roleLabels = {
  launch: "Launch",
  feature: "Feature",
  engagement: "Engagement",
} as const;

function updateAssetInStrategy(
  strategy: SocialStrategyBrief,
  assetNumber: number,
  patch: Partial<SocialAssetPlan>,
  screenshotCount: number,
): SocialStrategyBrief {
  return {
    ...strategy,
    assets: strategy.assets.map((asset) =>
      asset.assetNumber === assetNumber ? normalizeSocialAssetEdit(asset, patch, screenshotCount) : asset,
    ),
  };
}

export function SocialStrategyPreview({
  strategy,
  screenshotPreviews,
  isGenerating,
  hasEdits,
  onStrategyChange,
  onResetStrategy,
  onGenerate,
  onBack,
  onCancel,
}: SocialStrategyPreviewProps) {
  if (!strategy) {
    return (
      <section className="preview-panel">
        <div className="empty-state standalone-empty">
          <span>Social Pack</span>
          <p>Upload your app and screenshots. AI will plan Instagram, Story, and X posts with captions.</p>
        </div>
      </section>
    );
  }

  const screenshotCount = screenshotPreviews.length;

  const updateBriefField = (
    field: keyof Pick<SocialStrategyBrief, "positioning" | "primaryMessage" | "visualTheme">,
    value: string,
  ) => {
    onStrategyChange({ ...strategy, [field]: value });
  };

  const updateAsset = (assetNumber: number, patch: Partial<SocialAssetPlan>) => {
    onStrategyChange(updateAssetInStrategy(strategy, assetNumber, patch, screenshotCount));
  };

  const updateAssetCopy = (
    assetNumber: number,
    field: "hook" | "caption" | "hashtags",
    value: string,
  ) => {
    onStrategyChange({
      ...strategy,
      assets: strategy.assets.map((asset) =>
        asset.assetNumber === assetNumber
          ? normalizeSocialAssetEdit(
              updateCopyField(
                asset,
                field,
                field === "hashtags" ? value.split(/[\s,]+/) : value,
              ),
              {},
              screenshotCount,
            )
          : asset,
      ),
    });
  };

  const selectVariant = (assetNumber: number, variantId: CopyVariantId) => {
    onStrategyChange({
      ...strategy,
      assets: strategy.assets.map((asset) =>
        asset.assetNumber === assetNumber ? selectCopyVariant(asset, variantId) : asset,
      ),
    });
  };

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">AI Marketing Director</p>
          <h2>Social Launch Plan</h2>
        </div>
        <div className="toolbar-actions">
          {isGenerating ? (
            <button className="secondary-action cancel-action" type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button className="secondary-action" type="button" onClick={onBack} disabled={isGenerating}>
            Back
          </button>
          {hasEdits ? (
            <button className="secondary-action" type="button" onClick={onResetStrategy} disabled={isGenerating}>
              Reset to AI
            </button>
          ) : null}
          <button className="primary-action compact-action" type="button" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Social Pack"}
          </button>
        </div>
      </div>

      <p className="strategy-note">
        AI chose platforms, copy, screenshots, and hashtags. Edit anything before generating images and captions.
      </p>

      <div className="strategy-summary editable-summary">
        <label className="strategy-card field">
          <span>Positioning</span>
          <textarea
            rows={3}
            value={strategy.positioning}
            onChange={(event) => updateBriefField("positioning", event.target.value)}
            disabled={isGenerating}
          />
        </label>
        <label className="strategy-card field">
          <span>Primary Message</span>
          <textarea
            rows={3}
            value={strategy.primaryMessage}
            onChange={(event) => updateBriefField("primaryMessage", event.target.value)}
            disabled={isGenerating}
          />
        </label>
        <label className="strategy-card field">
          <span>Visual Theme</span>
          <textarea
            rows={3}
            value={strategy.visualTheme}
            onChange={(event) => updateBriefField("visualTheme", event.target.value)}
            disabled={isGenerating}
          />
        </label>
      </div>

      <div className="slide-plan-list">
        {strategy.assets.map((asset) => (
          <article key={asset.assetNumber} className="slide-plan-card editable-slide-card">
            <div className="slide-plan-header">
              <span className="slide-badge">{socialPlatformMeta[asset.platform].label}</span>
              <span className="role-badge">{roleLabels[asset.role]}</span>
              <span className="format-badge">{socialPlatformMeta[asset.platform].formatLabel}</span>
              <span className="ai-badge">AI proposed</span>
            </div>

            <div className="editable-slide-grid">
              <label className="field">
                <span>On-image headline</span>
                <input
                  type="text"
                  value={asset.headline}
                  onChange={(event) => updateAsset(asset.assetNumber, { headline: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <label className="field">
                <span>On-image subheadline</span>
                <textarea
                  rows={2}
                  value={asset.subheadline}
                  onChange={(event) => updateAsset(asset.assetNumber, { subheadline: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <CopyVariantPicker
                selectedVariantId={asset.selectedVariantId}
                variantA={asset.copyVariants[0]}
                variantB={asset.copyVariants[1]}
                disabled={isGenerating}
                onSelect={(variantId) => selectVariant(asset.assetNumber, variantId)}
              />

              <label className="field">
                <span>Hook (first line)</span>
                <input
                  type="text"
                  value={asset.hook}
                  onChange={(event) => updateAssetCopy(asset.assetNumber, "hook", event.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Caption</span>
                <textarea
                  rows={3}
                  value={asset.caption}
                  onChange={(event) => updateAssetCopy(asset.assetNumber, "caption", event.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Hashtags (space or comma separated)</span>
                <input
                  type="text"
                  value={asset.hashtags.map((tag) => `#${tag}`).join(" ")}
                  onChange={(event) => updateAssetCopy(asset.assetNumber, "hashtags", event.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className="field">
                <span>Screenshot usage</span>
                <select
                  value={asset.screenshotUsage}
                  onChange={(event) =>
                    updateAsset(asset.assetNumber, {
                      screenshotUsage: event.target.value as ScreenshotUsage,
                    })
                  }
                  disabled={isGenerating || screenshotCount === 0}
                >
                  {screenshotUsageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {asset.screenshotUsage !== "none" && screenshotCount > 0 ? (
                <label className="field">
                  <span>Which screen</span>
                  <select
                    value={asset.screenshotIndex ?? 0}
                    onChange={(event) =>
                      updateAsset(asset.assetNumber, {
                        screenshotIndex: Number(event.target.value),
                      })
                    }
                    disabled={isGenerating}
                  >
                    {screenshotPreviews.map((preview) => (
                      <option key={preview.index} value={preview.index}>
                        Screen {preview.index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="field screenshot-choice-preview">
                  <span>Image input</span>
                  <p className="text-only-note">Text-only creative. No screenshot sent to the model.</p>
                </div>
              )}

              {asset.screenshotUsage !== "none" && asset.screenshotIndex !== null ? (
                <div className="field screenshot-choice-preview">
                  <span>Selected screen</span>
                  <img
                    src={screenshotPreviews[asset.screenshotIndex]?.previewUrl}
                    alt={`Selected screen ${asset.screenshotIndex + 1}`}
                  />
                </div>
              ) : null}

              <label className="field field-wide">
                <span>Visual direction</span>
                <textarea
                  rows={2}
                  value={asset.visualStyle}
                  onChange={(event) => updateAsset(asset.assetNumber, { visualStyle: event.target.value })}
                  disabled={isGenerating}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
