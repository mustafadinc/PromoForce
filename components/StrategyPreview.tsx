"use client";

import { useMemo } from "react";
import type {
  BackgroundTreatment,
  ScreenshotQualityRating,
  ScreenshotUsage,
  SetMode,
  SlideLayoutStyle,
  StoreSlidePlan,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { normalizeSlideEdit, screenshotUsageOptions } from "@/lib/normalizeSlideEdit";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";
import {
  applyCreativeDirectorDefaults,
  countUniqueBackgroundGenerations,
  describeBackgroundPlan,
  isSlideSolidBackground,
} from "@/lib/storeCreativeDirector";
import type { AppProfile } from "@/lib/campaignTypes";
import { lintScreenshotAspects } from "@/lib/screenshotAspectLint";
import {
  assignSlideToBackgroundScene,
  sceneSharesSlide,
  toggleSceneSlideAssignment,
} from "@/lib/syncBackgroundScenes";

type ScreenshotPreview = {
  index: number;
  previewUrl: string;
  width?: number;
  height?: number;
};

type StrategyPreviewProps = {
  strategy: StrategyBrief | null;
  appProfile?: AppProfile | null;
  screenshotPreviews: ScreenshotPreview[];
  isGenerating: boolean;
  hasEdits: boolean;
  onStrategyChange: (strategy: StrategyBrief) => void;
  onResetStrategy: () => void;
  onGenerate: (options?: { variantsPerSlide?: number }) => void;
  onBack: () => void;
  onCancel?: () => void;
};

const roleLabels = {
  hero: "Hero",
  feature: "Feature",
  cta: "CTA",
} as const;

const treatmentLabels: Record<BackgroundTreatment, string> = {
  lifestyle_with_person: "Lifestyle + person",
  lifestyle_environment: "Environment only (no person)",
  abstract_brand: "Abstract brand world",
  cta_brand: "CTA brand atmosphere (AI)",
};

const layoutLabels: Record<SlideLayoutStyle, string> = {
  hero_branded: "Hero + branding",
  lifestyle_focus: "Lifestyle focus",
  feature_pills: "Feature pills",
  cta_minimal: "CTA minimal",
};

const ratingClass: Record<ScreenshotQualityRating, string> = {
  great: "rating-great",
  usable: "rating-usable",
  retake: "rating-retake",
};

function updateSlideInStrategy(
  strategy: StrategyBrief,
  slideNumber: number,
  patch: Partial<StoreSlidePlan>,
  screenshotCount: number,
): StrategyBrief {
  return {
    ...strategy,
    slides: strategy.slides.map((slide) =>
      slide.slideNumber === slideNumber ? normalizeSlideEdit(slide, patch, screenshotCount) : slide,
    ),
  };
}

export function StrategyPreview({
  strategy,
  appProfile,
  screenshotPreviews,
  isGenerating,
  hasEdits,
  onStrategyChange,
  onResetStrategy,
  onGenerate,
  onBack,
  onCancel,
}: StrategyPreviewProps) {
  if (!strategy) {
    return (
      <section className="preview-panel">
        <div className="empty-state standalone-empty">
          <span>Strategy</span>
          <p>Upload your app profile and screenshots. AI will propose the plan, and you can edit it before generating.</p>
        </div>
      </section>
    );
  }

  const screenshotCount = screenshotPreviews.length;

  const updateBriefField = (
    field: keyof Pick<
      StrategyBrief,
      "positioning" | "primaryMessage" | "targetAudience" | "narrativeArc" | "designSystem" | "visualTheme"
    >,
    value: string,
  ) => {
    onStrategyChange({ ...strategy, [field]: value });
  };

  const updateScene = (sceneId: string, patch: Partial<(typeof strategy.backgroundScenes)[0]>) => {
    onStrategyChange({
      ...strategy,
      backgroundScenes: strategy.backgroundScenes.map((scene) =>
        scene.id === sceneId ? { ...scene, ...patch } : scene,
      ),
    });
  };

  const toggleSceneSlide = (sceneId: string, slideNumber: number, checked: boolean) => {
    const { backgroundScenes, slides } = toggleSceneSlideAssignment(
      strategy.backgroundScenes,
      strategy.slides,
      sceneId,
      slideNumber,
      checked,
    );
    onStrategyChange({ ...strategy, backgroundScenes, slides });
  };

  const assignBackgroundSceneToSlide = (slideNumber: number, sceneId: string | null) => {
    const { backgroundScenes, slides } = assignSlideToBackgroundScene(
      strategy.backgroundScenes,
      strategy.slides,
      slideNumber,
      sceneId,
    );
    onStrategyChange({ ...strategy, backgroundScenes, slides });
  };

  const aspectIssues = useMemo(() => lintScreenshotAspects(screenshotPreviews), [screenshotPreviews]);

  const hasRetakeScreenshots = strategy.screenshotAssessments?.some((a) => a.rating === "retake");

  const updateSlide = (slideNumber: number, patch: Partial<StoreSlidePlan>) => {
    onStrategyChange(updateSlideInStrategy(strategy, slideNumber, patch, screenshotCount));
  };

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">ASO Screenshot Strategy</p>
          <h2>Review & Edit Conversion Story</h2>
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
          <button
            className="primary-action compact-action"
            type="button"
            onClick={() => onGenerate({ variantsPerSlide: 1 })}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate 5 Slides"}
          </button>
          <button
            className="secondary-action compact-action"
            type="button"
            onClick={() => onGenerate({ variantsPerSlide: 3 })}
            disabled={isGenerating}
            title="3 variants per slide — higher API usage"
          >
            Generate 3× Variants
          </button>
        </div>
      </div>

      {hasRetakeScreenshots ? (
        <p className="strategy-warning">
          Some uploaded screenshots are rated <strong>Retake</strong>. Generation will continue, but consider
          replacing weak screens for better conversion.
        </p>
      ) : null}

      {aspectIssues.length ? (
        <div className="strategy-warning aspect-warning-panel">
          <strong>Screenshot aspect warnings</strong>
          <ul>
            {aspectIssues.map((issue) => (
              <li key={issue.index}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {strategy.setMode === "solid" ? (
        <div className="strategy-info solid-mode-banner">
          <strong>Solid set mode</strong>
          <p>
            All 5 slides use your <strong>Brand color</strong> ({strategy.brandColor || strategy.accentColor}) —
            generated in code (gradient + light grain), not from a fixed color library. Headlines and mockups still
            differ per slide.
          </p>
        </div>
      ) : strategy.setMode === "hybrid" ? (
        <div className="strategy-info hybrid-mode-banner">
          <strong>Hybrid mode</strong>
          <p>
            Slide <strong>{strategy.styleAnchorSlide || 1}</strong>: AI lifestyle hero background. Slides{" "}
            {strategy.slides
              .map((s) => s.slideNumber)
              .filter((n) => n !== (strategy.styleAnchorSlide || 1))
              .join(", ")}
            : solid <strong>{strategy.brandColor || strategy.accentColor}</strong> (your hex, not a preset). Change
            anchor via creative plan or reset strategy.
          </p>
        </div>
      ) : (
        <p className="strategy-info lifestyle-mode-hint">
          <strong>Lifestyle mode:</strong> up to {countUniqueBackgroundGenerations(strategy)} unique AI background
          plates — scenes can be shared across slides to save cost and keep the set cohesive.
        </p>
      )}

      <p className="strategy-note">
        AI built a 5-slide App Store conversion arc with deliberate background decisions — who appears, which
        slides share the same scene, and how each layout supports the story. Edit before generating.
      </p>

      {strategy.backgroundScenes?.length ? (
        <div className="creative-scenes-panel">
          <div className="creative-scenes-header">
            <h3>Background plan</h3>
            <span className="scene-count-badge">{describeBackgroundPlan(strategy)}</span>
          </div>
          <div className="creative-scenes-list">
            {strategy.backgroundScenes.map((scene) => (
              <article key={scene.id} className="creative-scene-card">
                <div className="creative-scene-top">
                  <input
                    className="scene-label-input"
                    value={scene.label}
                    onChange={(e) => updateScene(scene.id, { label: e.target.value })}
                    disabled={isGenerating}
                  />
                  <span
                    className={
                      scene.id === "solid-brand-set" ? "treatment-badge solid-fill-badge" : "treatment-badge"
                    }
                  >
                    {scene.id === "solid-brand-set" ? "Solid fill" : treatmentLabels[scene.treatment]}
                  </span>
                </div>
                <textarea
                  rows={2}
                  className="scene-description-input"
                  value={scene.sceneDescription}
                  onChange={(e) => updateScene(scene.id, { sceneDescription: e.target.value })}
                  disabled={isGenerating}
                />
                <div className="scene-slides-picker">
                  <span className="scene-slides-label">Shared by slides</span>
                  <div className="scene-slide-checks">
                    {[1, 2, 3, 4, 5].map((slideNum) => (
                      <label key={slideNum} className="scene-slide-check">
                        <input
                          type="checkbox"
                          checked={sceneSharesSlide(scene, slideNum)}
                          onChange={(e) => toggleSceneSlide(scene.id, slideNum, e.target.checked)}
                          disabled={
                            isGenerating ||
                            strategy.setMode === "solid" ||
                            (strategy.setMode === "hybrid" && scene.id === "solid-brand-set")
                          }
                        />
                        {slideNum}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="scene-reuse-note">{scene.reuseRationale}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {strategy.narrativeArc ? (
        <p className="strategy-narrative">
          <strong>Story arc:</strong> {strategy.narrativeArc}
        </p>
      ) : null}

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
          <span>Set mode</span>
          <select
            value={strategy.setMode}
            onChange={(event) => {
              const setMode = event.target.value as SetMode;
              if (!appProfile) {
                onStrategyChange({ ...strategy, setMode });
                return;
              }
              onStrategyChange(
                applyCreativeDirectorDefaults({ ...strategy, setMode }, appProfile),
              );
            }}
            disabled={isGenerating}
          >
            <option value="lifestyle">Lifestyle — AI scenes (2–4)</option>
            <option value="hybrid">Hybrid — slide 1 AI, rest solid</option>
            <option value="solid">Solid — all slides your brand color</option>
          </select>
        </label>
        {strategy.setMode === "hybrid" ? (
          <label className="strategy-card field">
            <span>AI hero slide (hybrid)</span>
            <select
              value={strategy.styleAnchorSlide || 1}
              onChange={(event) => {
                const styleAnchorSlide = Number(event.target.value);
                if (!appProfile) {
                  onStrategyChange({ ...strategy, styleAnchorSlide });
                  return;
                }
                onStrategyChange(
                  applyCreativeDirectorDefaults({ ...strategy, styleAnchorSlide }, appProfile),
                );
              }}
              disabled={isGenerating}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Slide {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="strategy-card field">
          <span>Target audience</span>
          <input
            type="text"
            value={strategy.targetAudience}
            onChange={(event) => onStrategyChange({ ...strategy, targetAudience: event.target.value })}
            disabled={isGenerating}
          />
        </label>
        <label className="strategy-card field">
          <span>Accent color</span>
          <input
            type="text"
            value={strategy.accentColor}
            onChange={(event) => onStrategyChange({ ...strategy, accentColor: event.target.value })}
            disabled={isGenerating}
            placeholder="#2dd4bf"
          />
        </label>
        <label className="strategy-card field">
          <span>Brand color (solid mode)</span>
          <input
            type="text"
            value={strategy.brandColor}
            onChange={(event) => onStrategyChange({ ...strategy, brandColor: event.target.value })}
            disabled={isGenerating}
            placeholder="#2dd4bf"
          />
        </label>
        <label className="strategy-card field">
          <span>Design System (cohesion)</span>
          <textarea
            rows={2}
            value={strategy.designSystem}
            onChange={(event) => updateBriefField("designSystem", event.target.value)}
            disabled={isGenerating}
            placeholder="Shared palette, typography, layout rhythm..."
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

      {strategy.screenshotAssessments?.length ? (
        <div className="screenshot-qa-panel">
          <h3>Screenshot QA</h3>
          <div className="screenshot-qa-list">
            {strategy.screenshotAssessments.map((assessment) => (
              <div key={assessment.index} className="screenshot-qa-row">
                <span>Screen {assessment.index + 1}</span>
                <span className={`rating-badge ${ratingClass[assessment.rating]}`}>{assessment.rating}</span>
                {assessment.issues.length ? <span className="qa-issues">{assessment.issues.join(" · ")}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="slide-plan-list">
        {strategy.slides.map((slide) => (
          <article key={slide.slideNumber} className="slide-plan-card editable-slide-card">
            <div className="slide-plan-header">
              <span className="slide-badge">Slide {slide.slideNumber}</span>
              <span className="role-badge">{roleLabels[slide.role]}</span>
              <span className="aso-badge">{storeSlideBeatMeta[slide.asoBeat]?.label || slide.asoBeat}</span>
              {slide.screenshotRating ? (
                <span className={`rating-badge ${ratingClass[slide.screenshotRating]}`}>{slide.screenshotRating}</span>
              ) : null}
            </div>

            {slide.screenshotRating === "retake" && slide.retakeGuidance ? (
              <p className="retake-guidance">{slide.retakeGuidance}</p>
            ) : null}
            {slide.screenshotIssues?.length ? (
              <p className="qa-issues slide-qa-issues">{slide.screenshotIssues.join(" · ")}</p>
            ) : null}

            <p className="slide-conversion-goal">{slide.conversionGoal}</p>

            <div className="creative-slide-meta">
              <span
                className={
                  isSlideSolidBackground(
                    strategy.setMode,
                    slide.slideNumber,
                    strategy.styleAnchorSlide,
                  )
                    ? "treatment-badge solid-fill-badge"
                    : "treatment-badge"
                }
              >
                {isSlideSolidBackground(strategy.setMode, slide.slideNumber, strategy.styleAnchorSlide)
                  ? `Solid ${strategy.brandColor || strategy.accentColor}`
                  : treatmentLabels[slide.backgroundTreatment]}
              </span>
              <span className="layout-badge">{layoutLabels[slide.layoutStyle]}</span>
              {!isSlideSolidBackground(strategy.setMode, slide.slideNumber, strategy.styleAnchorSlide) &&
              slide.backgroundSceneId ? (
                <span className="scene-id-badge">
                  Scene: {strategy.backgroundScenes.find((s) => s.id === slide.backgroundSceneId)?.label || slide.backgroundSceneId}
                </span>
              ) : null}
            </div>

            {slide.backgroundRationale ? (
              <p className="background-rationale">
                <strong>Why:</strong> {slide.backgroundRationale}
              </p>
            ) : null}

            <div className="editable-slide-grid">
              <label className="field">
                <span>Action verb (line 1)</span>
                <input
                  type="text"
                  value={slide.headlineVerb}
                  onChange={(event) => updateSlide(slide.slideNumber, { headlineVerb: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <label className="field">
                <span>Benefit descriptor (line 2)</span>
                <input
                  type="text"
                  value={slide.headlineDescriptor}
                  onChange={(event) =>
                    updateSlide(slide.slideNumber, { headlineDescriptor: event.target.value })
                  }
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Full headline (preview)</span>
                <input type="text" value={slide.headline} readOnly disabled className="readonly-field" />
              </label>

              <label className="field">
                <span>Subheadline</span>
                <textarea
                  rows={2}
                  value={slide.subheadline}
                  onChange={(event) => updateSlide(slide.slideNumber, { subheadline: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <label className="field">
                <span>Screenshot usage</span>
                <select
                  value={slide.screenshotUsage}
                  onChange={(event) =>
                    updateSlide(slide.slideNumber, {
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

              {slide.screenshotUsage !== "none" && screenshotCount > 0 ? (
                <div className="screenshot-picker-block">
                  <label className="field screenshot-picker-select">
                    <span>Which screen</span>
                    <select
                      value={slide.screenshotIndex ?? 0}
                      onChange={(event) =>
                        updateSlide(slide.slideNumber, {
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
                  {slide.screenshotIndex !== null ? (
                    <div className="screenshot-picker-preview">
                      <img
                        src={screenshotPreviews[slide.screenshotIndex]?.previewUrl}
                        alt={`Selected screen ${slide.screenshotIndex + 1}`}
                      />
                      {slide.screenshotRationale ? (
                        <p className="screenshot-rationale">{slide.screenshotRationale}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="field field-wide text-only-slide-note">
                  <span>Preview</span>
                  <p className="text-only-note">Text-only slide. No app screenshot will be sent to the model.</p>
                </div>
              )}

              <label className="field">
                <span>Headline accent (gradient highlight)</span>
                <input
                  type="text"
                  value={slide.headlineAccent}
                  onChange={(event) => updateSlide(slide.slideNumber, { headlineAccent: event.target.value })}
                  disabled={isGenerating}
                  placeholder="e.g. deep work"
                />
              </label>

              <label className="field">
                <span>Background scene</span>
                <select
                  value={slide.backgroundSceneId || ""}
                  onChange={(event) =>
                    assignBackgroundSceneToSlide(slide.slideNumber, event.target.value || null)
                  }
                  disabled={
                    isGenerating ||
                    isSlideSolidBackground(strategy.setMode, slide.slideNumber, strategy.styleAnchorSlide)
                  }
                >
                  <option value="">—</option>
                  {strategy.backgroundScenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Show app branding bar</span>
                <select
                  value={slide.showAppBranding ? "yes" : "no"}
                  onChange={(event) =>
                    updateSlide(slide.slideNumber, { showAppBranding: event.target.value === "yes" })
                  }
                  disabled={isGenerating}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              {strategy.setMode === "lifestyle" ? (
                <label className="field">
                  <span>Background treatment</span>
                  <select
                    value={slide.backgroundTreatment}
                    onChange={(event) =>
                      updateSlide(slide.slideNumber, {
                        backgroundTreatment: event.target.value as BackgroundTreatment,
                      })
                    }
                    disabled={isGenerating}
                  >
                    {Object.entries(treatmentLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="field">
                <span>Layout style</span>
                <select
                  value={slide.layoutStyle}
                  onChange={(event) =>
                    updateSlide(slide.slideNumber, {
                      layoutStyle: event.target.value as SlideLayoutStyle,
                    })
                  }
                  disabled={isGenerating}
                >
                  {Object.entries(layoutLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field-wide">
                <span>Feature pills (hook slide, comma-separated)</span>
                <input
                  type="text"
                  value={slide.featureHighlights.join(", ")}
                  onChange={(event) =>
                    updateSlide(slide.slideNumber, {
                      featureHighlights: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  disabled={isGenerating}
                  placeholder="Ready Routines, App Blocking, AI Coach"
                />
              </label>

              <label className="field field-wide">
                <span>Background rationale</span>
                <textarea
                  rows={2}
                  value={slide.backgroundRationale}
                  onChange={(event) => updateSlide(slide.slideNumber, { backgroundRationale: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Visual variant (scene mood)</span>
                <textarea
                  rows={2}
                  value={slide.visualVariant}
                  onChange={(event) => updateSlide(slide.slideNumber, { visualVariant: event.target.value })}
                  disabled={isGenerating}
                />
              </label>

              <label className="field field-wide">
                <span>Layout direction</span>
                <textarea
                  rows={2}
                  value={slide.visualStyle}
                  onChange={(event) => updateSlide(slide.slideNumber, { visualStyle: event.target.value })}
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
