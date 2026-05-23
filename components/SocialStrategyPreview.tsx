"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { ScreenshotVisualPanel } from "@/components/ScreenshotVisualPanel";
import { CopyVariantPicker } from "@/components/CopyVariantPicker";
import { CopyToast } from "@/components/CopyToast";
import { StrategyCarousel, type CarouselStep } from "@/components/StrategyCarousel";
import { StrategyToolbar } from "@/components/StrategyToolbar";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import type { CopyVariantId, SocialAssetPlan, SocialStrategyBrief, SocialPlatform } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { selectCopyVariant, updateCopyField } from "@/lib/copyVariants";
import { normalizeSocialAssetEdit, socialPlatformOptions } from "@/lib/normalizeSocialAssetEdit";
import { coerceStrategyText } from "@/lib/strategyText";
import { formatSocialPostCopy } from "@/lib/buildSocialAssetPrompt";

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
  const [stepIndex, setStepIndex] = useState(0);
  const { copyMessage, copyText, clearCopyMessage } = useCopyFeedback();

  const steps = useMemo<CarouselStep[]>(() => {
    if (!strategy) return [];
    return [
      { id: "brief", label: "Campaign brief", subtitle: "Positioning & theme" },
      ...strategy.assets.map((asset) => ({
        id: `asset-${asset.assetNumber}`,
        label: socialPlatformMeta[asset.platform].label,
        subtitle: asset.headline.slice(0, 48),
      })),
    ];
  }, [strategy]);

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
  const isBriefStep = stepIndex === 0;
  const asset = isBriefStep ? null : strategy.assets[stepIndex - 1];

  const updateBriefField = (
    field: keyof Pick<SocialStrategyBrief, "positioning" | "primaryMessage" | "visualTheme">,
    value: string,
  ) => {
    onStrategyChange({ ...strategy, [field]: value });
  };

  const updateAsset = (assetNumber: number, patch: Partial<SocialAssetPlan>) => {
    onStrategyChange(updateAssetInStrategy(strategy, assetNumber, patch, screenshotCount));
  };

  const updateAssetCopy = (assetNumber: number, field: "hook" | "caption" | "hashtags", value: string) => {
    onStrategyChange({
      ...strategy,
      assets: strategy.assets.map((entry) =>
        entry.assetNumber === assetNumber
          ? normalizeSocialAssetEdit(
              updateCopyField(entry, field, field === "hashtags" ? value.split(/[\s,#]+/) : value),
              {},
              screenshotCount,
            )
          : entry,
      ),
    });
  };

  const selectVariant = (assetNumber: number, variantId: CopyVariantId) => {
    onStrategyChange({
      ...strategy,
      assets: strategy.assets.map((entry) =>
        entry.assetNumber === assetNumber ? selectCopyVariant(entry, variantId) : entry,
      ),
    });
  };

  return (
    <section className="preview-panel pf-strategy-panel pf-social-strategy">
      <StrategyToolbar
        eyebrow="Social Launch Pack"
        title="Review one post at a time"
        actions={
          <>
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
          </>
        }
      />

      <StrategyCarousel steps={steps} activeIndex={stepIndex} onActiveIndexChange={setStepIndex}>
        {isBriefStep ? (
          <div className="pf-carousel-step pf-form-section-grid-single">
            <label className="field">
              <span>Positioning</span>
              <textarea
                rows={3}
                value={coerceStrategyText(strategy.positioning)}
                onChange={(event) => updateBriefField("positioning", event.target.value)}
                disabled={isGenerating}
              />
            </label>
            <label className="field">
              <span>Primary message</span>
              <textarea
                rows={2}
                value={coerceStrategyText(strategy.primaryMessage)}
                onChange={(event) => updateBriefField("primaryMessage", event.target.value)}
                disabled={isGenerating}
              />
            </label>
            <label className="field">
              <span>Visual theme</span>
              <textarea
                rows={3}
                value={coerceStrategyText(strategy.visualTheme)}
                onChange={(event) => updateBriefField("visualTheme", event.target.value)}
                disabled={isGenerating}
                placeholder="e.g. Colors: dark, calming · Fonts: clean sans-serif · Mood: premium minimal"
              />
            </label>

            <section className="pf-form-section pf-launch-formats">
              <h4 className="pf-form-section-title">Launch pack formats</h4>
              <p className="pf-form-section-hint">
                Choose where each post goes — Feed post, Story, or X. Reels and carousel sequences are available in
                Autopilot calendar mode.
              </p>
              <ul className="pf-launch-format-list">
                {strategy.assets.map((entry, index) => (
                  <li key={entry.assetNumber} className="pf-launch-format-row">
                    <span className="pf-launch-format-index">Post {index + 1}</span>
                    <label className="field pf-launch-format-field">
                      <span className="sr-only">Platform for post {index + 1}</span>
                      <select
                        value={entry.platform}
                        onChange={(event) =>
                          updateAsset(entry.assetNumber, { platform: event.target.value as SocialPlatform })
                        }
                        disabled={isGenerating}
                      >
                        {socialPlatformOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="format-badge">
                      {socialPlatformMeta[entry.platform].formatLabel}
                    </span>
                    <button
                      type="button"
                      className="pf-launch-format-jump"
                      onClick={() => setStepIndex(index + 1)}
                      disabled={isGenerating}
                    >
                      Edit post
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : asset ? (
          <div className="pf-carousel-step pf-step-split">
            <div className="pf-step-form-column">
            <div className="pf-carousel-step-meta">
              <span className="role-badge">{roleLabels[asset.role]}</span>
              <span className="format-badge">{socialPlatformMeta[asset.platform].formatLabel}</span>
            </div>

            <section className="pf-form-section pf-platform-section">
              <h4 className="pf-form-section-title">Platform & format</h4>
              <label className="field">
                <span>Where should this post go?</span>
                <select
                  value={asset.platform}
                  onChange={(event) =>
                    updateAsset(asset.assetNumber, { platform: event.target.value as SocialPlatform })
                  }
                  disabled={isGenerating}
                >
                  {socialPlatformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </option>
                  ))}
                </select>
              </label>

              {screenshotCount > 0 && asset.screenshotUsage !== "none" ? (
                <label className="field">
                  <span>App screen for this post</span>
                  <select
                    value={asset.screenshotIndex ?? 0}
                    onChange={(event) =>
                      updateAsset(asset.assetNumber, { screenshotIndex: Number(event.target.value) })
                    }
                    disabled={isGenerating}
                  >
                    {screenshotPreviews.map((shot) => (
                      <option key={shot.index} value={shot.index}>
                        Screen {shot.index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </section>

            <section className="pf-form-section">
              <h4 className="pf-form-section-title">On-image text</h4>
              <div className="pf-form-section-grid pf-form-section-grid-single">
                <label className="field">
                  <span>Headline</span>
                  <input
                    type="text"
                    value={asset.headline}
                    onChange={(event) => updateAsset(asset.assetNumber, { headline: event.target.value })}
                    disabled={isGenerating}
                  />
                </label>
                <label className="field">
                  <span>Subheadline</span>
                  <input
                    type="text"
                    value={asset.subheadline}
                    onChange={(event) => updateAsset(asset.assetNumber, { subheadline: event.target.value })}
                    disabled={isGenerating}
                  />
                </label>
              </div>
            </section>

            <section className="pf-form-section">
              <div className="pf-form-section-head">
                <h4 className="pf-form-section-title">Post caption</h4>
                <button
                  type="button"
                  className="pf-copy-link"
                  onClick={() =>
                    void copyText(
                      formatSocialPostCopy({ hook: asset.hook, caption: asset.caption, hashtags: asset.hashtags }),
                      "Full post copied",
                    )
                  }
                >
                  <Copy aria-hidden="true" />
                  Copy full post
                </button>
              </div>
              <CopyVariantPicker
                selectedVariantId={asset.selectedVariantId}
                variantA={asset.copyVariants[0]}
                variantB={asset.copyVariants[1]}
                disabled={isGenerating}
                showPreview={false}
                onSelect={(variantId) => selectVariant(asset.assetNumber, variantId)}
              />
              <div className="pf-form-section-grid pf-form-section-grid-single">
                <label className="field">
                  <span>Hook</span>
                  <input
                    type="text"
                    value={asset.hook}
                    onChange={(event) => updateAssetCopy(asset.assetNumber, "hook", event.target.value)}
                    disabled={isGenerating}
                  />
                </label>
                <label className="field">
                  <span>Caption body</span>
                  <textarea
                    rows={4}
                    value={asset.caption}
                    onChange={(event) => updateAssetCopy(asset.assetNumber, "caption", event.target.value)}
                    disabled={isGenerating}
                    className="pf-caption-textarea"
                  />
                </label>
                <label className="field">
                  <span>Hashtags</span>
                  <input
                    type="text"
                    value={asset.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ")}
                    onChange={(event) => updateAssetCopy(asset.assetNumber, "hashtags", event.target.value)}
                    disabled={isGenerating}
                  />
                </label>
              </div>
            </section>
            </div>

            <ScreenshotVisualPanel
              screenshots={screenshotPreviews}
              screenshotUsage={asset.screenshotUsage}
              screenshotIndex={asset.screenshotIndex}
              platform={asset.platform}
              visualStyle={asset.visualStyle}
              isGenerating={isGenerating}
              onUsageChange={(usage) => updateAsset(asset.assetNumber, { screenshotUsage: usage })}
              onScreenshotSelect={(index) => updateAsset(asset.assetNumber, { screenshotIndex: index })}
              onVisualStyleChange={(value) => updateAsset(asset.assetNumber, { visualStyle: value })}
            />
          </div>
        ) : null}
      </StrategyCarousel>

      <CopyToast message={copyMessage} onDismiss={clearCopyMessage} />
    </section>
  );
}
