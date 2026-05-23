"use client";

import { useMemo, useState } from "react";
import { ScreenshotVisualPanel } from "@/components/ScreenshotVisualPanel";
import { CopyVariantPicker } from "@/components/CopyVariantPicker";
import { StrategyCarousel, type CarouselStep } from "@/components/StrategyCarousel";
import { StrategyToolbar } from "@/components/StrategyToolbar";
import type {
  AutopilotPostRole,
  AutopilotStrategyBrief,
  CalendarPostPlan,
  CopyVariantId,
  SocialPlatform,
} from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { selectCopyVariant, updateCopyField } from "@/lib/copyVariants";
import {
  autopilotRoleOptions,
  normalizeCalendarPostEdit,
  platformOptions,
  postFormatOptions,
} from "@/lib/normalizeCalendarPostEdit";
import { formatScheduledLabel } from "@/lib/scheduleUtils";
import { coerceStrategyText } from "@/lib/strategyText";

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
  const screenshotCount = screenshotPreviews.length;
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo<CarouselStep[]>(() => {
    if (!strategy) return [];
    return [
      { id: "brief", label: "Calendar settings", subtitle: `${strategy.duration}-day plan` },
      ...strategy.posts.map((post) => ({
        id: `day-${post.day}`,
        label: `Day ${post.day}`,
        subtitle: `${socialPlatformMeta[post.platform].label} · ${post.headline.slice(0, 36)}`,
      })),
    ];
  }, [strategy]);

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

  const screenshotDays = strategy.posts.filter((post) => post.screenshotUsage !== "none").length;
  const textOnlyDays = strategy.posts.length - screenshotDays;
  const isBriefStep = stepIndex === 0;
  const post = isBriefStep ? null : strategy.posts[stepIndex - 1];

  const updatePost = (day: number, patch: Partial<CalendarPostPlan>) => {
    onStrategyChange(updatePostInStrategy(strategy, day, patch, screenshotCount));
  };

  const updatePostCopy = (day: number, field: "hook" | "caption" | "hashtags", value: string) => {
    onStrategyChange({
      ...strategy,
      posts: strategy.posts.map((entry) =>
        entry.day === day
          ? normalizeCalendarPostEdit(
              updateCopyField(entry, field, field === "hashtags" ? value.split(/[\s,]+/) : value),
              {},
              screenshotCount,
            )
          : entry,
      ),
    });
  };

  const selectVariant = (day: number, variantId: CopyVariantId) => {
    onStrategyChange({
      ...strategy,
      posts: strategy.posts.map((entry) => (entry.day === day ? selectCopyVariant(entry, variantId) : entry)),
    });
  };

  return (
    <section className="preview-panel pf-strategy-panel pf-autopilot-strategy">
      <StrategyToolbar
        eyebrow="AI Marketing Director"
        title={`Review one day at a time · ${strategy.duration}-day calendar`}
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
              {isGenerating ? "Generating..." : `Generate ${strategy.duration} Posts`}
            </button>
          </>
        }
      />

      <StrategyCarousel steps={steps} activeIndex={stepIndex} onActiveIndexChange={setStepIndex}>
        {isBriefStep ? (
          <div className="pf-carousel-step">
            <p className="strategy-note">
              AI planned {strategy.duration} days starting {strategy.startDate}. {screenshotDays} posts use
              screenshots, {textOnlyDays} are text-only. Use next to edit each day.
            </p>

            <div className="strategy-summary editable-summary pf-strategy-summary">
              <label className="strategy-card field">
                <span>Brand voice</span>
                <textarea
                  rows={2}
                  value={coerceStrategyText(strategy.brandVoice)}
                  onChange={(event) => onStrategyChange({ ...strategy, brandVoice: event.target.value })}
                  disabled={isGenerating}
                />
              </label>
              <label className="strategy-card field">
                <span>Visual theme</span>
                <textarea
                  rows={2}
                  value={coerceStrategyText(strategy.visualTheme)}
                  onChange={(event) => onStrategyChange({ ...strategy, visualTheme: event.target.value })}
                  disabled={isGenerating}
                />
              </label>
              <div className="strategy-card">
                <h3>Content pillars</h3>
                <p>{strategy.contentPillars.join(" · ")}</p>
              </div>
              {strategy.phases?.length ? (
                <div className="strategy-card field-wide">
                  <h3>Campaign phases (AI)</h3>
                  <ul className="phase-list">
                    {strategy.phases.map((phase) => (
                      <li key={phase.id}>
                        <strong>{phase.name}</strong> — days {phase.dayStart}–{phase.dayEnd}: {phase.narrativeFocus}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : post ? (
          <div className="pf-carousel-step pf-step-split">
            <div className="pf-step-form-column">
            <div className="pf-carousel-step-meta">
              <span className="role-badge">{socialPlatformMeta[post.platform].label}</span>
              <span className="format-badge">
                {formatScheduledLabel(strategy.startDate, post.day, post.scheduledTime)}
              </span>
            </div>

            <p className="ai-decision-note">
              <span className="ai-badge">AI decision</span> {post.screenshotRationale}
            </p>

            <div className="editable-slide-grid pf-form-section-grid-single">
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
                <span>Format</span>
                <select
                  value={post.format || "single"}
                  onChange={(event) =>
                    updatePost(post.day, {
                      format: event.target.value as CalendarPostPlan["format"],
                    })
                  }
                  disabled={isGenerating}
                >
                  {postFormatOptions.map((option) => (
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

              <label className="field field-wide">
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
                showPreview={false}
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
            </div>

            <ScreenshotVisualPanel
              screenshots={screenshotPreviews}
              screenshotUsage={post.screenshotUsage}
              screenshotIndex={post.screenshotIndex}
              platform={post.platform}
              visualStyle={post.visualStyle}
              rationale={post.screenshotRationale}
              isGenerating={isGenerating}
              onUsageChange={(usage) => updatePost(post.day, { screenshotUsage: usage })}
              onScreenshotSelect={(index) => updatePost(post.day, { screenshotIndex: index })}
              onVisualStyleChange={(value) => updatePost(post.day, { visualStyle: value })}
            />
          </div>
        ) : null}
      </StrategyCarousel>
    </section>
  );
}
