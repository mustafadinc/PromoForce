"use client";

import type { ScreenshotIntelligence, ScreenshotQualityRating } from "@/lib/campaignTypes";

type ScreenshotPreview = {
  index: number;
  previewUrl: string;
};

type ScreenshotIntelligencePanelProps = {
  intelligence: ScreenshotIntelligence[];
  screenshotPreviews: ScreenshotPreview[];
};

const ratingClass: Record<ScreenshotQualityRating, string> = {
  great: "rating-great",
  usable: "rating-usable",
  retake: "rating-retake",
};

export function ScreenshotIntelligencePanel({
  intelligence,
  screenshotPreviews,
}: ScreenshotIntelligencePanelProps) {
  if (!intelligence.length) return null;

  return (
    <section className="pf-screenshot-intel-panel">
      <div className="pf-set-overview-header">
        <h4 className="pf-form-section-title">Screenshot intelligence</h4>
        <p className="pf-form-section-hint">
          AI analyzed each upload — features, tags, and headline ideas used across strategy and Reels.
        </p>
      </div>
      <div className="pf-screenshot-intel-grid">
        {intelligence.map((intel) => {
          const preview = screenshotPreviews.find((item) => item.index === intel.index);
          return (
            <article key={intel.index} className="pf-screenshot-intel-card">
              <div className="pf-screenshot-intel-top">
                {preview ? (
                  <figure
                    className="pf-screenshot-intel-thumb"
                    style={{ backgroundImage: `url("${preview.previewUrl}")` }}
                  />
                ) : null}
                <div>
                  <span className="aso-badge">Screen {intel.index + 1}</span>
                  <span className={`aso-badge ${ratingClass[intel.rating]}`}>{intel.rating}</span>
                  {intel.screenType ? <span className="aso-badge">{intel.screenType}</span> : null}
                </div>
              </div>
              <p className="pf-screenshot-intel-desc">{intel.description}</p>
              {intel.detectedFeatures.length ? (
                <p className="pf-screenshot-intel-meta">
                  <strong>Features:</strong> {intel.detectedFeatures.join(", ")}
                </p>
              ) : null}
              {intel.suggestedHeadlines.length ? (
                <p className="pf-screenshot-intel-meta">
                  <strong>Headlines:</strong> {intel.suggestedHeadlines.slice(0, 2).join(" · ")}
                </p>
              ) : null}
              {intel.tags.length ? (
                <p className="pf-screenshot-intel-tags">{intel.tags.map((tag) => `#${tag}`).join(" ")}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
