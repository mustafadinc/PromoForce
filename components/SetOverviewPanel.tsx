"use client";

import type { ScreenshotAssessment, ScreenshotQualityRating, StoreSlidePlan } from "@/lib/campaignTypes";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

type ScreenshotPreview = {
  index: number;
  previewUrl: string;
};

type SetOverviewPanelProps = {
  slides: StoreSlidePlan[];
  screenshotAssessments?: ScreenshotAssessment[];
  screenshotPreviews: ScreenshotPreview[];
  activeSlideNumber?: number | null;
  onSelectSlide?: (slideNumber: number) => void;
};

const ratingClass: Record<ScreenshotQualityRating, string> = {
  great: "rating-great",
  usable: "rating-usable",
  retake: "rating-retake",
};

function assessmentForSlide(
  slide: StoreSlidePlan,
  assessments: ScreenshotAssessment[] | undefined,
): ScreenshotAssessment | null {
  if (!assessments?.length || slide.screenshotIndex === null) return null;
  return assessments.find((a) => a.index === slide.screenshotIndex) ?? null;
}

export function SetOverviewPanel({
  slides,
  screenshotAssessments,
  screenshotPreviews,
  activeSlideNumber = null,
  onSelectSlide,
}: SetOverviewPanelProps) {
  return (
    <section className="pf-set-overview">
      <div className="pf-set-overview-header">
        <h4 className="pf-form-section-title">Set overview</h4>
        <p className="pf-form-section-hint">Five-slide ASO story — click a slide to edit.</p>
      </div>
      <div className="pf-set-overview-grid">
        {slides.map((slide) => {
          const beat = storeSlideBeatMeta[slide.asoBeat];
          const assessment = assessmentForSlide(slide, screenshotAssessments);
          const rating = slide.screenshotRating ?? assessment?.rating;
          const preview =
            slide.screenshotIndex !== null
              ? screenshotPreviews.find((s) => s.index === slide.screenshotIndex)
              : null;

          return (
            <button
              key={slide.slideNumber}
              type="button"
              className={`pf-set-overview-card ${activeSlideNumber === slide.slideNumber ? "is-active" : ""}`}
              onClick={() => onSelectSlide?.(slide.slideNumber)}
            >
              <div className="pf-set-overview-card-top">
                <span className="aso-badge">{beat.label}</span>
                {rating ? <span className={`aso-badge ${ratingClass[rating]}`}>{rating}</span> : null}
              </div>
              <p className="pf-set-overview-headline">{slide.headline || "—"}</p>
              <p className="pf-set-overview-sub">{slide.subheadline || beat.conversionGoal.slice(0, 60)}</p>
              {preview ? (
                <figure
                  className="pf-set-overview-thumb"
                  style={{ backgroundImage: `url("${preview.previewUrl}")` }}
                  title={`Screen ${preview.index + 1}`}
                />
              ) : (
                <span className="pf-set-overview-no-screen">No screenshot</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
