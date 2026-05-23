"use client";

import { formatSocialPostCopy, platformLabel } from "@/lib/buildSocialAssetPrompt";
import { PerformanceFeedback } from "@/components/PerformanceFeedback";
import type { GeneratedSocialAsset } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";

type SocialPackGalleryProps = {
  appName: string;
  assets: GeneratedSocialAsset[];
  progressLabel: string;
  partialPreviewUrl?: string;
  isGenerating: boolean;
  onRestart: () => void;
  onCancel?: () => void;
};

export function SocialPackGallery({
  appName,
  assets,
  progressLabel,
  partialPreviewUrl,
  isGenerating,
  onRestart,
  onCancel,
}: SocialPackGalleryProps) {
  const downloadImage = (asset: GeneratedSocialAsset) => {
    const link = document.createElement("a");
    link.href = asset.dataUrl;
    link.download = `${asset.platform}-promo.png`;
    link.click();
  };

  const copyPost = async (asset: GeneratedSocialAsset) => {
    const text = formatSocialPostCopy(asset);
    await navigator.clipboard.writeText(text);
  };

  const downloadAllImages = () => {
    assets.forEach((asset, index) => {
      window.setTimeout(() => downloadImage(asset), index * 250);
    });
  };

  return (
    <section className="preview-panel gallery-panel">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">Social Launch Pack</p>
          <h2>{isGenerating ? progressLabel : "Your Posts"}</h2>
        </div>
        <div className="toolbar-actions">
          {isGenerating ? (
            <button className="secondary-action cancel-action" type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button className="secondary-action" type="button" onClick={onRestart} disabled={isGenerating}>
            New Campaign
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={downloadAllImages}
            disabled={isGenerating || assets.length === 0}
          >
            Download All Images
          </button>
        </div>
      </div>

      {isGenerating && partialPreviewUrl ? (
        <div className="generation-preview">
          <img src={partialPreviewUrl} alt="Background generation preview" />
          <p>{progressLabel}</p>
        </div>
      ) : null}

      {isGenerating && assets.length === 0 && !partialPreviewUrl ? (
        <div className="empty-state standalone-empty">
          <span>Generating</span>
          <p>{progressLabel}</p>
        </div>
      ) : null}

      <div className="social-gallery">
        {assets.map((asset) => {
          const aspect =
            asset.platform === "instagram_story"
              ? "9 / 16"
              : asset.platform === "twitter"
                ? "16 / 9"
                : "1 / 1";

          return (
            <article key={asset.assetNumber} className="social-asset-card">
              <div className="social-asset-image" style={{ aspectRatio: aspect }}>
                <img src={asset.dataUrl} alt={`${platformLabel(asset.platform)} post for ${asset.headline}`} />
              </div>
              <div className="social-asset-copy">
                <div className="slide-plan-header">
                  <span className="slide-badge">{socialPlatformMeta[asset.platform].label}</span>
                  <span className="format-badge">{socialPlatformMeta[asset.platform].formatLabel}</span>
                </div>
                <h3>{asset.headline}</h3>
                <pre className="post-copy-preview">{formatSocialPostCopy(asset)}</pre>
                <div className="toolbar-actions card-actions">
                  <button className="secondary-action compact-action" type="button" onClick={() => downloadImage(asset)}>
                    Download Image
                  </button>
                  <button className="secondary-action compact-action" type="button" onClick={() => copyPost(asset)}>
                    Copy Caption
                  </button>
                </div>
                <PerformanceFeedback
                  appName={appName}
                  itemId={`social-${asset.assetNumber}`}
                  platform={asset.platform}
                  hook={asset.hook}
                  usedScreenshot={asset.usedScreenshot}
                  variantId={asset.selectedVariantId}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
