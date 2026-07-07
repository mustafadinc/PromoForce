"use client";

import { useEffect, useMemo, useState } from "react";
import { NarrativeProgressBar } from "@/components/NarrativeProgressBar";
import { ScreenshotIntelligencePanel } from "@/components/ScreenshotIntelligencePanel";
import { SetOverviewPanel } from "@/components/SetOverviewPanel";
import { StoreSlideEditor } from "@/components/StoreSlideEditor";
import { StrategyCarousel, type CarouselStep } from "@/components/StrategyCarousel";
import { StrategyToolbar } from "@/components/StrategyToolbar";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { StrategyPreflightPanel } from "@/components/StrategyPreflightPanel";
import { lintStrategyNarrative } from "@/lib/narrativeLint";
import type { SetCoherenceAudit } from "@/lib/agents/setCoherenceAgent";
import { coerceStrategyText } from "@/lib/strategyText";
import type {
  BackgroundTreatment,
  LocaleCode,
  ScreenshotQualityRating,
  SetMode,
  StoreSlidePlan,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { normalizeSlideEdit } from "@/lib/normalizeSlideEdit";
import { buildSlidePatchForScreenshot } from "@/lib/syncSlideToScreenshot";
import {
  applyCreativeDirectorDefaults,
  describeBackgroundPlan,
} from "@/lib/storeCreativeDirector";
import type { AppProfile } from "@/lib/campaignTypes";
import { lintScreenshotAspects } from "@/lib/screenshotAspectLint";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";
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
  customBackgroundsBySlide?: Record<number, string>;
  isGenerating: boolean;
  hasEdits: boolean;
  activeLocale?: LocaleCode;
  locales?: LocaleCode[];
  onLocaleChange?: (locale: LocaleCode) => void;
  onCustomBackgroundChange?: (slideNumber: number, dataUrl: string | null) => void;
  onStrategyChange: (strategy: StrategyBrief) => void;
  onResetStrategy: () => void;
  onGenerate: (options?: { variantsPerSlide?: number }) => void;
  onBack: () => void;
  onCancel?: () => void;
  coherenceAudit?: SetCoherenceAudit | null;
  isAuditing?: boolean;
  localeMismatchCount?: number;
};

const treatmentLabels: Record<BackgroundTreatment, string> = {
  lifestyle_with_person: "Lifestyle + person",
  lifestyle_environment: "Environment only (no person)",
  abstract_brand: "Abstract brand world",
  cta_brand: "CTA brand atmosphere (AI)",
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
  appProfile: AppProfile,
): StrategyBrief {
  return {
    ...strategy,
    slides: strategy.slides.map((slide) =>
      slide.slideNumber === slideNumber
        ? normalizeSlideEdit(slide, patch, screenshotCount, { strategy, appProfile })
        : slide,
    ),
  };
}

export function StrategyPreview({
  strategy,
  appProfile,
  screenshotPreviews,
  customBackgroundsBySlide = {},
  isGenerating,
  hasEdits,
  activeLocale = "en",
  locales = [],
  onLocaleChange,
  onCustomBackgroundChange,
  onStrategyChange,
  onResetStrategy,
  onGenerate,
  onBack,
  onCancel,
  coherenceAudit = null,
  isAuditing = false,
  localeMismatchCount = 0,
}: StrategyPreviewProps) {
  const screenshotCount = screenshotPreviews.length;
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo<CarouselStep[]>(() => {
    if (!strategy) return [];
    return [
      { id: "brief", label: "Campaign setup", subtitle: "Positioning & set mode" },
      ...strategy.slides.map((slide) => ({
        id: `slide-${slide.slideNumber}`,
        label: `Slide ${slide.slideNumber}`,
        subtitle: `${storeSlideBeatMeta[slide.asoBeat].label} · ${slide.headline.slice(0, 40)}`,
      })),
    ];
  }, [strategy]);

  const aspectIssues = useMemo(() => lintScreenshotAspects(screenshotPreviews), [screenshotPreviews]);

  const narrativeLint = useMemo(
    () => (strategy ? lintStrategyNarrative(strategy) : null),
    [strategy],
  );

  const retakeCount =
    strategy?.screenshotAssessments?.filter((a) => a.rating === "retake").length ?? 0;

  const hasRetakeScreenshots =
    strategy?.screenshotAssessments?.some((assessment) => assessment.rating === "retake") ?? false;
  const plannedSlideCount = strategy?.slides.length ?? 0;
  const plannedSlideNumbers = strategy?.slides.map((slide) => slide.slideNumber) ?? [];

  const requestGenerate = (options?: { variantsPerSlide?: number }) => {
    const reasons: string[] = [];
    if (narrativeLint && !narrativeLint.ok) {
      reasons.push(`${narrativeLint.criticalCount} narrative issue(s) — hook/CTA flow may not convert.`);
    }
    if (coherenceAudit && coherenceAudit.overallScore < 80) {
      reasons.push(`Coherence score ${coherenceAudit.overallScore}/100 is below 80.`);
    }
    if (hasRetakeScreenshots) {
      reasons.push("Some screenshots are rated Retake.");
    }
    if (aspectIssues.length) {
      reasons.push(`${aspectIssues.length} screenshot(s) have non–App Store aspect.`);
    }
    if (localeMismatchCount > 0) {
      reasons.push(`${localeMismatchCount} locale has UI language mismatch.`);
    }
    if (reasons.length) {
      const ok = window.confirm(`${reasons.join(" ")}\n\nGenerate anyway?`);
      if (!ok) return;
    }
    onGenerate(options);
  };

  const goToSlide = (slideNumber: number) => {
    setStepIndex(slideNumber);
  };

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

  const [screenshotSyncNotice, setScreenshotSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    setScreenshotSyncNotice(null);
  }, [stepIndex]);

  const updateSlide = (slideNumber: number, patch: Partial<StoreSlidePlan>) => {
    const slide = strategy.slides.find((item) => item.slideNumber === slideNumber);
    if (
      appProfile &&
      slide &&
      typeof patch.screenshotIndex === "number" &&
      patch.screenshotIndex !== slide.screenshotIndex
    ) {
      const { message } = buildSlidePatchForScreenshot(strategy, slide, patch.screenshotIndex, appProfile);
      setScreenshotSyncNotice(message);
    }
    onStrategyChange(
      updateSlideInStrategy(strategy, slideNumber, patch, screenshotCount, appProfile ?? { appName: "", category: "", description: "", targetAudience: "" }),
    );
  };

  const isBriefStep = stepIndex === 0;
  const activeSlide = isBriefStep ? null : strategy.slides[stepIndex - 1];

  return (
    <section className="preview-panel pf-strategy-panel">
      <LocaleSwitcher
        locales={locales.length ? locales : strategy?.locale ? [strategy.locale] : ["en"]}
        activeLocale={activeLocale}
        onChange={(locale) => onLocaleChange?.(locale)}
        disabled={isGenerating}
      />
      <StrategyToolbar
        eyebrow="ASO Screenshot Strategy"
        title="Review one slide at a time"
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
            <button
              className="primary-action compact-action"
              type="button"
              onClick={() => requestGenerate({ variantsPerSlide: 1 })}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : `Generate ${plannedSlideCount} Slides`}
            </button>
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => requestGenerate({ variantsPerSlide: 3 })}
              disabled={isGenerating}
              title="3 variants per slide — higher API usage"
            >
              Generate 3× Variants
            </button>
          </>
        }
      />

      <NarrativeProgressBar
        narrativeArc={isBriefStep ? strategy.narrativeArc : undefined}
        slides={strategy.slides}
        activeSlideNumber={isBriefStep ? null : activeSlide?.slideNumber ?? null}
        onSelectSlide={goToSlide}
      />

      {narrativeLint && !narrativeLint.ok ? (
        <div className="strategy-warning pf-narrative-lint-banner">
          <strong>Narrative issues</strong>
          <ul>
            {narrativeLint.issues
              .filter((issue) => issue.severity === "error")
              .slice(0, 4)
              .map((issue, index) => (
                <li key={`${issue.code}-${index}`}>
                  {issue.slideNumber ? `Slide ${issue.slideNumber}: ` : ""}
                  {issue.message}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <StrategyPreflightPanel
        narrativeLint={narrativeLint ?? { ok: true, criticalCount: 0, warningCount: 0, issues: [] }}
        coherenceAudit={coherenceAudit}
        retakeCount={retakeCount}
        aspectIssueCount={aspectIssues.length}
        localeMismatchCount={localeMismatchCount}
        isAuditing={isAuditing}
      />

      <StrategyCarousel steps={steps} activeIndex={stepIndex} onActiveIndexChange={setStepIndex}>
        {isBriefStep ? (
          <div className="pf-carousel-step">
      <SetOverviewPanel
        slides={strategy.slides}
        screenshotAssessments={strategy.screenshotAssessments}
        screenshotIntelligence={strategy.screenshotIntelligence}
        screenshotPreviews={screenshotPreviews}
        onSelectSlide={goToSlide}
      />

      {strategy.screenshotIntelligence?.length ? (
        <ScreenshotIntelligencePanel
          intelligence={strategy.screenshotIntelligence}
          screenshotPreviews={screenshotPreviews}
        />
      ) : null}

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
            All {plannedSlideCount} slides use your <strong>Brand color</strong> ({strategy.brandColor || strategy.accentColor}) —
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
          <strong>Lifestyle mode:</strong> {plannedSlideCount} unique AI background
          plates — one custom scene per App Store screenshot.
        </p>
      )}

      <p className="strategy-note">
        AI built a {plannedSlideCount}-slide App Store conversion arc with deliberate background decisions — who appears, which
        slides share the same scene, and how each layout supports the story. Edit before generating.
      </p>

      {strategy.backgroundScenes?.length ? (
        <details className="pf-brief-panel pf-scenes-panel">
          <summary>Background plan ({strategy.backgroundScenes.length} scenes)</summary>
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
                    {plannedSlideNumbers.map((slideNum) => (
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
        </details>
      ) : null}

      <details className="pf-brief-panel" open>
        <summary>Campaign & set settings</summary>
      <div className="strategy-summary editable-summary pf-strategy-summary">
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
            <option value="lifestyle">Lifestyle — AI scenes ({plannedSlideCount})</option>
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
              {plannedSlideNumbers.map((n) => (
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
          <span>Font Family</span>
          <select
            value={strategy.fontFamily || "Inter"}
            onChange={(event) => onStrategyChange({ ...strategy, fontFamily: event.target.value })}
            disabled={isGenerating}
          >
            {[
              "Inter",
              "Roboto",
              "Montserrat",
              "Oswald",
              "Playfair Display",
              "Poppins",
              "Outfit",
              "Caveat"
            ].map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
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
            value={coerceStrategyText(strategy.visualTheme)}
            onChange={(event) => updateBriefField("visualTheme", event.target.value)}
            disabled={isGenerating}
          />
        </label>
      </div>
      </details>

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

          </div>
        ) : activeSlide ? (
          <>
            {screenshotSyncNotice ? (
              <p className="pf-screenshot-sync-notice" role="status">
                {screenshotSyncNotice}
              </p>
            ) : null}
            <StoreSlideEditor
              slide={activeSlide}
              strategy={strategy}
              screenshotPreviews={screenshotPreviews}
              customBackgroundUrl={customBackgroundsBySlide[activeSlide.slideNumber]}
              screenshotCount={screenshotCount}
              isGenerating={isGenerating}
              onCustomBackgroundChange={(dataUrl) =>
                onCustomBackgroundChange?.(activeSlide.slideNumber, dataUrl)
              }
              onUpdateSlide={(patch) => updateSlide(activeSlide.slideNumber, patch)}
              onAssignScene={(sceneId) => assignBackgroundSceneToSlide(activeSlide.slideNumber, sceneId)}
            />
          </>
        ) : null}
      </StrategyCarousel>
    </section>
  );
}
