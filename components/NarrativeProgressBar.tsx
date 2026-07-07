"use client";

import type { StoreSlideBeat, StoreSlidePlan } from "@/lib/campaignTypes";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

const beatOrder: StoreSlideBeat[] = [
  "hook",
  "problem_outcome",
  "feature_benefit",
  "social_proof",
  "download_cta",
];

type NarrativeProgressBarProps = {
  narrativeArc?: string;
  slides?: StoreSlidePlan[];
  activeSlideNumber?: number | null;
  onSelectSlide?: (slideNumber: number) => void;
};

export function NarrativeProgressBar({
  narrativeArc,
  slides,
  activeSlideNumber = null,
  onSelectSlide,
}: NarrativeProgressBarProps) {
  const steps = slides?.length
    ? slides.map((slide) => ({
        key: String(slide.slideNumber),
        slideNumber: slide.slideNumber,
        beat: slide.asoBeat,
      }))
    : beatOrder.map((beat, index) => ({
        key: beat,
        slideNumber: index + 1,
        beat,
      }));

  return (
    <section className="pf-narrative-bar">
      <div className="pf-narrative-track" role="list">
        {steps.map(({ key, slideNumber, beat }) => {
          const meta = storeSlideBeatMeta[beat];
          const isActive = activeSlideNumber === slideNumber;

          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className={`pf-narrative-step ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectSlide?.(slideNumber)}
              title={`${meta.label}: ${meta.conversionGoal}`}
            >
              <span className="pf-narrative-step-num">{slideNumber}</span>
              <span className="pf-narrative-step-label">Slide {slideNumber}</span>
            </button>
          );
        })}
      </div>
      {narrativeArc ? (
        <p className="strategy-narrative">
          <strong>Story arc:</strong> {narrativeArc}
        </p>
      ) : null}
    </section>
  );
}
