"use client";

import { Copy, Download } from "lucide-react";
import { CopyToast } from "@/components/CopyToast";
import { ExportStatusStrip } from "@/components/ExportStatusStrip";
import { PerformanceFeedback } from "@/components/PerformanceFeedback";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { formatSocialPostCopy, platformLabel } from "@/lib/buildSocialAssetPrompt";
import type { GeneratedSocialAsset } from "@/lib/campaignTypes";
import { isSocialReelsAsset, socialPlatformMeta } from "@/lib/campaignTypes";
import { downloadDataUrl } from "@/lib/downloadDataUrl";

type SocialPackGalleryProps = {
  appName: string;
  assets: GeneratedSocialAsset[];
  progressLabel: string;
  partialPreviewUrl?: string;
  isGenerating: boolean;
  onRestart: () => void;
  onCancel?: () => void;
};

function aspectRatioForPlatform(platform: GeneratedSocialAsset["platform"] | null): string {
  if (platform === "instagram_story" || platform === "instagram_reels") return "9 / 16";
  if (platform === "twitter") return "16 / 9";
  return "1 / 1";
}

function inferStreamingAspectRatio(progressLabel: string): string {
  const lower = progressLabel.toLowerCase();
  if (
    lower.includes("instagram story") ||
    lower.includes("instagram_story") ||
    lower.includes("instagram reels") ||
    lower.includes("instagram_reels") ||
    lower.includes("reels video")
  ) {
    return "9 / 16";
  }
  if (lower.includes("twitter")) return "16 / 9";
  return "1 / 1";
}

function isReelsAsset(asset: GeneratedSocialAsset): boolean {
  return isSocialReelsAsset(asset) || Boolean(asset.videoDataUrl);
}

export function SocialPackGallery({
  appName,
  assets,
  progressLabel,
  partialPreviewUrl,
  isGenerating,
  onRestart,
  onCancel,
}: SocialPackGalleryProps) {
  const { copyMessage, copyText, clearCopyMessage } = useCopyFeedback();

  const downloadImage = (asset: GeneratedSocialAsset) => {
    downloadDataUrl(asset.dataUrl, `${asset.platform}-promo.png`);
  };

  const downloadVideo = (asset: GeneratedSocialAsset) => {
    if (!asset.videoDataUrl) return;
    downloadDataUrl(asset.videoDataUrl, `${asset.platform}-promo.mp4`);
  };

  const copyPost = async (asset: GeneratedSocialAsset) => {
    await copyText(formatSocialPostCopy(asset), "Caption copied");
  };

  const downloadAllAssets = () => {
    assets.forEach((asset, index) => {
      window.setTimeout(() => {
        if (isReelsAsset(asset) && asset.videoDataUrl) {
          downloadVideo(asset);
        } else {
          downloadImage(asset);
        }
      }, index * 250);
    });
  };

  return (
    <section className="preview-panel gallery-panel pf-gallery-panel">
      <ExportStatusStrip
        isGenerating={isGenerating}
        progressLabel={progressLabel}
        complete={!isGenerating && assets.length > 0}
        completeTitle="Social pack ready"
        completeMessage={`${assets.length} platform assets generated and ready to download.`}
      />

      <div className="pf-export-header">
        <div className="pf-export-header-actions">
          {isGenerating ? (
            <button className="secondary-action cancel-action compact-action" type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button className="secondary-action compact-action" type="button" onClick={onRestart} disabled={isGenerating}>
            New Campaign
          </button>
          <button
            className="secondary-action compact-action"
            type="button"
            onClick={downloadAllAssets}
            disabled={isGenerating || assets.length === 0}
          >
            Download All
          </button>
        </div>
      </div>

      {isGenerating && partialPreviewUrl && assets.length === 0 ? (
        <div className="generation-preview pf-stream-preview">
          <div
            className="generation-preview-frame"
            style={{ aspectRatio: inferStreamingAspectRatio(progressLabel) }}
          >
            <img src={partialPreviewUrl} alt="Background generation preview" className="generation-preview-image" />
          </div>
          <p className="generation-preview-caption">{progressLabel}</p>
        </div>
      ) : null}

      {isGenerating && assets.length === 0 && !partialPreviewUrl ? (
        <div className="empty-state standalone-empty">
          <span>Generating</span>
          <p>{progressLabel}</p>
        </div>
      ) : null}

      <div className="pf-social-export-list">
        {assets.map((asset) => {
          const aspect = aspectRatioForPlatform(asset.platform);
          const showVideo = isReelsAsset(asset) && asset.videoDataUrl;

          return (
            <article key={asset.assetNumber} className="pf-social-export-card glass-panel">
              <div className="pf-social-export-visual">
                <div className="pf-export-slide-frame pf-social-export-frame" style={{ aspectRatio: aspect }}>
                  {showVideo ? (
                    <video
                      src={asset.videoDataUrl}
                      controls
                      playsInline
                      loop
                      muted
                      className="pf-social-export-video"
                      poster={asset.dataUrl}
                    />
                  ) : (
                    <img src={asset.dataUrl} alt={`${platformLabel(asset.platform)} post for ${asset.headline}`} />
                  )}
                  <div className="pf-export-slide-hover">
                    <button type="button" className="pf-export-hover-btn" onClick={() => void copyPost(asset)} title="Copy caption">
                      <Copy aria-hidden="true" />
                    </button>
                    {showVideo ? (
                      <button type="button" className="pf-export-hover-btn" onClick={() => downloadVideo(asset)} title="Download MP4">
                        <Download aria-hidden="true" />
                      </button>
                    ) : (
                      <button type="button" className="pf-export-hover-btn" onClick={() => downloadImage(asset)} title="Download image">
                        <Download aria-hidden="true" />
                      </button>
                    )}
                    <span className="pf-export-hover-label">Quick actions</span>
                  </div>
                </div>
              </div>

              <div className="social-asset-copy pf-social-export-copy">
                <div className="slide-plan-header">
                  <span className="slide-badge">{socialPlatformMeta[asset.platform].label}</span>
                  <span className="format-badge">{socialPlatformMeta[asset.platform].formatLabel}</span>
                  {showVideo ? <span className="role-badge">Video</span> : null}
                  <span className="role-badge">Variant {asset.selectedVariantId}</span>
                </div>
                <h3>{asset.headline}</h3>
                <pre className="post-copy-preview">{formatSocialPostCopy(asset)}</pre>
                <div className="toolbar-actions card-actions">
                  {showVideo ? (
                    <>
                      <button className="secondary-action compact-action" type="button" onClick={() => downloadVideo(asset)}>
                        Download MP4
                      </button>
                      <button className="secondary-action compact-action" type="button" onClick={() => downloadImage(asset)}>
                        Download Cover PNG
                      </button>
                    </>
                  ) : (
                    <button className="secondary-action compact-action" type="button" onClick={() => downloadImage(asset)}>
                      Download Image
                    </button>
                  )}
                  <button className="secondary-action compact-action" type="button" onClick={() => void copyPost(asset)}>
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

        {isGenerating && partialPreviewUrl && assets.length > 0 ? (
          <article className="pf-social-export-card glass-panel is-streaming">
            <div className="pf-social-export-visual">
              <div
                className="pf-export-slide-frame pf-social-export-frame"
                style={{ aspectRatio: inferStreamingAspectRatio(progressLabel) }}
              >
                <img src={partialPreviewUrl} alt="Background generation preview" />
              </div>
            </div>
            <div className="social-asset-copy pf-social-export-copy">
              <div className="slide-plan-header">
                <span className="slide-badge">Generating</span>
              </div>
              <p className="generation-preview-caption">{progressLabel}</p>
            </div>
          </article>
        ) : null}
      </div>

      <CopyToast message={copyMessage} onDismiss={clearCopyMessage} />
    </section>
  );
}
