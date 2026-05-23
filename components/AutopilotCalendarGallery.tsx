"use client";

import { formatCalendarPostCopy } from "@/lib/buildAutopilotPostPrompt";
import { platformLabel } from "@/lib/buildSocialAssetPrompt";
import { PerformanceFeedback } from "@/components/PerformanceFeedback";
import type { AutopilotStrategyBrief, GeneratedCalendarPost } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { buildCalendarExport } from "@/lib/scheduleUtils";

type AutopilotCalendarGalleryProps = {
  appName: string;
  strategy: AutopilotStrategyBrief | null;
  posts: GeneratedCalendarPost[];
  progressLabel: string;
  partialPreviewUrl?: string;
  isGenerating: boolean;
  onRestart: () => void;
  onCancel?: () => void;
};

export function AutopilotCalendarGallery({
  appName,
  strategy,
  posts,
  progressLabel,
  partialPreviewUrl,
  isGenerating,
  onRestart,
  onCancel,
}: AutopilotCalendarGalleryProps) {
  const downloadImage = (post: GeneratedCalendarPost) => {
    const link = document.createElement("a");
    link.href = post.dataUrl;
    link.download = `day-${post.day}-${post.platform}.png`;
    link.click();
  };

  const copyPost = async (post: GeneratedCalendarPost) => {
    await navigator.clipboard.writeText(formatCalendarPostCopy(post));
  };

  const exportSchedule = () => {
    if (!strategy) return;

    const payload = buildCalendarExport(strategy.startDate, posts);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `promoforce-calendar-${strategy.startDate}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="preview-panel gallery-panel autopilot-gallery">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">Marketing Autopilot</p>
          <h2>{isGenerating ? progressLabel : `${posts.length}-Day Calendar`}</h2>
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
            onClick={exportSchedule}
            disabled={isGenerating || posts.length === 0}
          >
            Export Schedule
          </button>
        </div>
      </div>

      {isGenerating && partialPreviewUrl ? (
        <div className="generation-preview">
          <img src={partialPreviewUrl} alt="Background generation preview" />
          <p>{progressLabel}</p>
        </div>
      ) : null}

      {isGenerating && posts.length === 0 && !partialPreviewUrl ? (
        <div className="empty-state standalone-empty">
          <span>Generating</span>
          <p>{progressLabel}</p>
        </div>
      ) : null}

      <div className="calendar-gallery">
        {posts.map((post) => {
          const aspect =
            post.platform === "instagram_story" ? "9 / 16" : post.platform === "twitter" ? "16 / 9" : "1 / 1";

          return (
            <article key={post.day} className="calendar-post-card">
              <div className="calendar-post-image" style={{ aspectRatio: aspect }}>
                <img src={post.dataUrl} alt={`Day ${post.day} ${platformLabel(post.platform)} post`} />
              </div>
              <div className="calendar-post-copy">
                <div className="slide-plan-header">
                  <span className="slide-badge">Day {post.day}</span>
                  <span className="role-badge">{socialPlatformMeta[post.platform].label}</span>
                  <span className="format-badge">
                    {post.scheduledDate} · {post.scheduledTime}
                  </span>
                </div>
                <h3>{post.headline}</h3>
                <p className="ai-decision-note">{post.screenshotRationale}</p>
                <pre className="post-copy-preview">{formatCalendarPostCopy(post)}</pre>
                <div className="toolbar-actions card-actions">
                  <button className="secondary-action compact-action" type="button" onClick={() => downloadImage(post)}>
                    Download
                  </button>
                  <button className="secondary-action compact-action" type="button" onClick={() => copyPost(post)}>
                    Copy Caption
                  </button>
                </div>
                <PerformanceFeedback
                  appName={appName}
                  itemId={`calendar-day-${post.day}`}
                  platform={post.platform}
                  hook={post.hook}
                  usedScreenshot={post.usedScreenshot}
                  variantId={post.selectedVariantId}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
