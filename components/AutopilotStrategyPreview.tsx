"use client";

import { CopyVariantPicker } from "@/components/CopyVariantPicker";
import type {
  AutopilotPostRole,
  AutopilotStrategyBrief,
  CalendarPostPlan,
  CopyVariantId,
  ScreenshotUsage,
  SocialPlatform,
} from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { selectCopyVariant, updateCopyField } from "@/lib/copyVariants";
import {
  autopilotRoleOptions,
  normalizeCalendarPostEdit,
  platformOptions,
  screenshotUsageOptions,
} from "@/lib/normalizeCalendarPostEdit";
import { formatScheduledLabel } from "@/lib/scheduleUtils";

type ScreenshotPreview = {
  index: number;
  previewUrl: string;
};

type AutopilotStrategyPreviewProps = {
  strategy: AutopilotStrategyBrief | null;
  screenshotPreviews: ScreenshotPreview[];
  isGenerating: boolean;
  hasEdits: boolean;
  onStrategyChange: (strategy: AutopilotStrategyBrief) => void;
  onResetStrategy: () => void;
  onGenerate: () => void;
  onBack: () => void;
  onCancel?: () => void;
};

function updatePostInStrategy(
  strategy: AutopilotStrategyBrief,
  day: number,
  patch: Partial<CalendarPostPlan>,
  screenshotCount: number,
): AutopilotStrategyBrief {
  return {
    ...strategy,
    posts: strategy.posts.map((post) =>
      post.day === day ? normalizeCalendarPostEdit(post, patch, screenshotCount) : post,
    ),
  };
}

export function AutopilotStrategyPreview({
  strategy,
  screenshotPreviews,
  isGenerating,
  hasEdits,
  onStrategyChange,
  onResetStrategy,
  onGenerate,
  onBack,
  onCancel,
}: AutopilotStrategyPreviewProps) {
  if (!strategy) {
    return (
      <section className="preview-panel">
        <div className="empty-state standalone-empty">
          <span>Autopilot</span>
          <p>AI will plan your 7 or 30-day calendar — daily platform, copy, and screenshot decisions included.</p>
        </div>
      </section>
    );
  }

  const screenshotCount = screenshotPreviews.length;
  const screenshotDays = strategy.posts.filter((post) => post.screenshotUsage !== "none").length;
  const textOnlyDays = strategy.posts.length - screenshotDays;

  const updatePost = (day: number, patch: Partial<CalendarPostPlan>) => {
    onStrategyChange(updatePostInStrategy(strategy, day, patch, screenshotCount));
  };

  const updatePostCopy = (day: number, field: "hook" | "caption" | "hashtags", value: string) => {
    onStrategyChange({
      ...strategy,
      posts: strategy.posts.map((post) =>
        post.day === day
          ? normalizeCalendarPostEdit(
              updateCopyField(post, field, field === "hashtags" ? value.split(/[\s,]+/) : value),
              {},
              screenshotCount,
            )
          : post,
      ),
    });
  };

  const selectVariant = (day: number, variantId: CopyVariantId) => {
    onStrategyChange({
      ...strategy,
      posts: strategy.posts.map((post) => (post.day === day ? selectCopyVariant(post, variantId) : post)),
    });
  };

  return (
    <section className="preview-panel autopilot-preview">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">AI Marketing Director</p>
          <h2>{strategy.duration}-Day Calendar</h2>
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
            {isGenerating ? "Generating..." : `Generate ${strategy.duration} Posts`}
          </button>
        </div>
      </div>

      <p className="strategy-note">
        AI planned {strategy.duration} days starting {strategy.startDate}. {screenshotDays} posts use screenshots,{" "}
        {textOnlyDays} are text-only. Edit any day before generating.
      </p>

      <div className="strategy-summary editable-summary">
        <label className="strategy-card field">
          <span>Brand voice</span>
          <textarea
            rows={2}
            value={strategy.brandVoice}
            onChange={(event) => onStrategyChange({ ...strategy, brandVoice: event.target.value })}
            disabled={isGenerating}
          />
        </label>
        <label className="strategy-card field">
          <span>Visual theme</span>
          <textarea
            rows={2}
            value={strategy.visualTheme}
            onChange={(event) => onStrategyChange({ ...strategy, visualTheme: event.target.value })}
            disabled={isGenerating}
          />
        </label>
        <div className="strategy-card">
          <h3>Content pillars</h3>
          <p>{strategy.contentPillars.join(" · ")}</p>
        </div>
      </div>

      <div className="calendar-plan-list">
        {strategy.posts.map((post) => (
          <details key={post.day} className="calendar-day-card" open={post.day <= 2}>
            <summary>
              <span className="slide-badge">Day {post.day}</span>
              <span className="role-badge">{socialPlatformMeta[post.platform].label}</span>
              <span className="format-badge">{formatScheduledLabel(strategy.startDate, post.day, post.scheduledTime)}</span>
              <strong>{post.headline}</strong>
            </summary>

            <div className="editable-slide-grid">
              <p className="ai-decision-note">
                <span className="ai-badge">AI decision</span> {post.screenshotRationale}
              </p>

              <label className="field">
                <span>Platform</span>
                <select
                  value={post.platform}
                  onChange={(event) => {
                    const platform = event.target.value as SocialPlatform;
                    updatePost(post.day, {
                      platform,
                      imageSize: socialPlatformMeta[platform].imageSize,
                    });
                  }}
                  disabled={isGenerating}
                >
                  {platformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Role</span>
                <select
                  value={post.role}
                  onChange={(event) => updatePost(post.day, { role: event.target.value as AutopilotPostRole })}
                  disabled={isGenerating}
                >
                  {autopilotRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Scheduled time</span>
                <input
                  type="time"
                  value={post.scheduledTime}
                  onChange={(event) => updatePost(post.day, { scheduledTime: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <label className="field">
                <span>Headline</span>
                <input
                  type="text"
                  value={post.headline}
                  onChange={(event) => updatePost(post.day, { headline: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <CopyVariantPicker
                selectedVariantId={post.selectedVariantId}
                variantA={post.copyVariants[0]}
                variantB={post.copyVariants[1]}
                disabled={isGenerating}
                onSelect={(variantId) => selectVariant(post.day, variantId)}
              />

              <label className="field field-wide">
                <span>Hook</span>
                <input
                  type="text"
                  value={post.hook}
                  onChange={(event) => updatePostCopy(post.day, "hook", event.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Caption</span>
                <textarea
                  rows={2}
                  value={post.caption}
                  onChange={(event) => updatePostCopy(post.day, "caption", event.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Hashtags</span>
                <input
                  type="text"
                  value={post.hashtags.map((tag) => `#${tag}`).join(" ")}
                  onChange={(event) => updatePostCopy(post.day, "hashtags", event.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className="field">
                <span>Screenshot usage</span>
                <select
                  value={post.screenshotUsage}
                  onChange={(event) =>
                    updatePost(post.day, { screenshotUsage: event.target.value as ScreenshotUsage })
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

              {post.screenshotUsage !== "none" && screenshotCount > 0 ? (
                <label className="field">
                  <span>Screen</span>
                  <select
                    value={post.screenshotIndex ?? 0}
                    onChange={(event) => updatePost(post.day, { screenshotIndex: Number(event.target.value) })}
                    disabled={isGenerating}
                  >
                    {screenshotPreviews.map((preview) => (
                      <option key={preview.index} value={preview.index}>
                        Screen {preview.index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="field field-wide">
                <span>AI rationale (editable)</span>
                <textarea
                  rows={2}
                  value={post.screenshotRationale}
                  onChange={(event) => updatePost(post.day, { screenshotRationale: event.target.value })}
                  disabled={isGenerating}
                />
              </label>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
