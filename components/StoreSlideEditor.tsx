"use client";

import { MockupPoseControls } from "@/components/MockupPoseControls";
import { MockupPosePreview } from "@/components/MockupPosePreview";
import { MockupAssetSelector } from "@/components/MockupAssetSelector";
import { VisualCompositionPanel } from "@/components/VisualCompositionPanel";
import { ScreenshotVisualPanel } from "@/components/ScreenshotVisualPanel";
import type {
  BackgroundTreatment,
  ScreenshotQualityRating,
  SlideLayoutStyle,
  StoreSlidePlan,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { isSceneMockup, mockupAssetForSlide, normalizeMockupAssetId } from "@/lib/assetMockup";
import { normalizeMockupPose, mockupPoseForSlide } from "@/lib/mockupPose";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";
import { isSlideSolidBackground } from "@/lib/storeCreativeDirector";

type ScreenshotPreview = {
  index: number;
  previewUrl: string;
};

const treatmentLabels: Record<BackgroundTreatment, string> = {
  lifestyle_with_person: "Lifestyle + person",
  lifestyle_environment: "Environment only",
  abstract_brand: "Abstract brand",
  cta_brand: "CTA atmosphere",
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

type StoreSlideEditorProps = {
  slide: StoreSlidePlan;
  strategy: StrategyBrief;
  screenshotPreviews: ScreenshotPreview[];
  screenshotCount: number;
  isGenerating: boolean;
  onUpdateSlide: (patch: Partial<StoreSlidePlan>) => void;
  onAssignScene: (sceneId: string | null) => void;
};

export function StoreSlideEditor({
  slide,
  strategy,
  screenshotPreviews,
  screenshotCount,
  isGenerating,
  onUpdateSlide,
  onAssignScene,
}: StoreSlideEditorProps) {
  const activeScreenshotUrl =
    slide.screenshotIndex !== null
      ? screenshotPreviews.find((shot) => shot.index === slide.screenshotIndex)?.previewUrl
      : null;
  const resolvedMockupId = normalizeMockupAssetId(
    slide.mockupAssetId ?? mockupAssetForSlide(slide.slideNumber),
  );
  const usesSceneTemplate = isSceneMockup(resolvedMockupId);

  return (
    <div className="pf-carousel-step pf-step-split">
      <div className="pf-step-form-column">
      <div className="pf-carousel-step-meta">
        <span className="aso-badge">{storeSlideBeatMeta[slide.asoBeat]?.label || slide.asoBeat}</span>
        <span className="role-badge">{slide.role}</span>
        {slide.screenshotRating ? (
          <span className={`rating-badge ${ratingClass[slide.screenshotRating]}`}>{slide.screenshotRating}</span>
        ) : null}
      </div>

      {slide.screenshotRating === "retake" && slide.retakeGuidance ? (
        <p className="retake-guidance">{slide.retakeGuidance}</p>
      ) : null}

      <p className="slide-conversion-goal">{slide.conversionGoal}</p>

      <div className="creative-slide-meta">
        <span
          className={
            isSlideSolidBackground(strategy.setMode, slide.slideNumber, strategy.styleAnchorSlide)
              ? "treatment-badge solid-fill-badge"
              : "treatment-badge"
          }
        >
          {isSlideSolidBackground(strategy.setMode, slide.slideNumber, strategy.styleAnchorSlide)
            ? `Solid ${slide.backgroundFillColor || strategy.brandColor || strategy.accentColor}`
            : treatmentLabels[slide.backgroundTreatment]}
        </span>
        <span className="layout-badge">{layoutLabels[slide.layoutStyle]}</span>
      </div>

      <VisualCompositionPanel slide={slide} strategy={strategy} />

      <div className="editable-slide-grid pf-store-slide-grid">
        <label className="field">
          <span>Action verb</span>
          <input
            type="text"
            value={slide.headlineVerb}
            onChange={(event) => onUpdateSlide({ headlineVerb: event.target.value })}
            disabled={isGenerating}
          />
        </label>
        <label className="field">
          <span>Benefit descriptor</span>
          <input
            type="text"
            value={slide.headlineDescriptor}
            onChange={(event) => onUpdateSlide({ headlineDescriptor: event.target.value })}
            disabled={isGenerating}
          />
        </label>
        <label className="field field-wide">
          <span>Headline preview</span>
          <input type="text" value={slide.headline} readOnly disabled className="readonly-field" />
        </label>
        <label className="field field-wide">
          <span>Subheadline</span>
          <textarea
            rows={2}
            value={slide.subheadline}
            onChange={(event) => onUpdateSlide({ subheadline: event.target.value })}
            disabled={isGenerating}
          />
        </label>
        <label className="field">
          <span>Layout</span>
          <select
            value={slide.layoutStyle}
            onChange={(event) => onUpdateSlide({ layoutStyle: event.target.value as SlideLayoutStyle })}
            disabled={isGenerating}
          >
            {Object.entries(layoutLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Background scene</span>
          <select
            value={slide.backgroundSceneId || ""}
            onChange={(event) => onAssignScene(event.target.value || null)}
            disabled={
              isGenerating || isSlideSolidBackground(strategy.setMode, slide.slideNumber, strategy.styleAnchorSlide)
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

        {strategy.setMode === "lifestyle" ? (
          <label className="field">
            <span>Background treatment</span>
            <select
              value={slide.backgroundTreatment}
              onChange={(event) =>
                onUpdateSlide({ backgroundTreatment: event.target.value as BackgroundTreatment })
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

        {slide.screenshotUsage !== "none" || slide.screenshotIndex !== null ? (
          <div className="field field-wide mockup-pose-strategy-block">
            <MockupAssetSelector
              value={resolvedMockupId}
              disabled={isGenerating}
              onChange={(mockupAssetId) => onUpdateSlide({ mockupAssetId })}
            />
            <span className="field-label">Mockup layout (AI + composite)</span>
            <p className="pf-form-section-hint">
              {usesSceneTemplate
                ? "iPhone 16 template angle is baked in — AI generates the lifestyle background behind the cut-out device."
                : "Angle, size, and position on the canvas. Background generation uses this to leave room for the device."}
            </p>
            <div className="mockup-pose-strategy-row">
              <MockupPoseControls
                pose={normalizeMockupPose(slide.mockupPose, slide.slideNumber)}
                disabled={isGenerating || usesSceneTemplate}
                onChange={(mockupPose) => onUpdateSlide({ mockupPose })}
              />
              <button
                type="button"
                className="secondary-action compact-action"
                disabled={isGenerating}
                onClick={() =>
                  onUpdateSlide({
                    mockupPose: mockupPoseForSlide(slide.slideNumber),
                    mockupAssetId: mockupAssetForSlide(slide.slideNumber),
                  })
                }
              >
                Apply beat preset
              </button>
              <MockupPosePreview
                compact
                slideNumber={slide.slideNumber}
                pose={normalizeMockupPose(slide.mockupPose, slide.slideNumber)}
                headline={slide.headline}
                subheadline={slide.subheadline}
                screenshotUrl={activeScreenshotUrl}
                mockupAssetId={resolvedMockupId}
              />
            </div>
          </div>
        ) : null}

        <details className="pf-advanced-panel field-wide">
          <summary>Advanced slide options</summary>
          <div className="pf-advanced-fields">
            <label className="field">
              <span>Headline accent</span>
              <input
                type="text"
                value={slide.headlineAccent}
                onChange={(event) => onUpdateSlide({ headlineAccent: event.target.value })}
                disabled={isGenerating}
              />
            </label>
            <label className="field">
              <span>App branding bar</span>
              <select
                value={slide.showAppBranding ? "yes" : "no"}
                onChange={(event) => onUpdateSlide({ showAppBranding: event.target.value === "yes" })}
                disabled={isGenerating}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Feature pills (comma-separated)</span>
              <input
                type="text"
                value={slide.featureHighlights.join(", ")}
                onChange={(event) =>
                  onUpdateSlide({
                    featureHighlights: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                disabled={isGenerating}
              />
            </label>
            <label className="field field-wide">
              <span>Visual mood</span>
              <textarea
                rows={2}
                value={slide.visualVariant}
                onChange={(event) => onUpdateSlide({ visualVariant: event.target.value })}
                disabled={isGenerating}
              />
            </label>
          </div>
        </details>
      </div>
      </div>

      <ScreenshotVisualPanel
        screenshots={screenshotPreviews}
        screenshotUsage={slide.screenshotUsage}
        screenshotIndex={slide.screenshotIndex}
        rationale={slide.screenshotRationale}
        isGenerating={isGenerating}
        showVisualDirection={false}
        onUsageChange={(usage) => onUpdateSlide({ screenshotUsage: usage })}
        onScreenshotSelect={(index) => {
          if (index !== slide.screenshotIndex) {
            onUpdateSlide({ screenshotIndex: index });
          }
        }}
      />
    </div>
  );
}
