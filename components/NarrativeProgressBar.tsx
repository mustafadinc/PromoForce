"use client";

import type { StoreSlideBeat } from "@/lib/campaignTypes";
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
  activeSlideNumber?: number | null;
  onSelectSlide?: (slideNumber: number) => void;
};

export function NarrativeProgressBar({
  narrativeArc,
  activeSlideNumber = null,
  onSelectSlide,
}: NarrativeProgressBarProps) {
  return (
    <section className="pf-narrative-bar">
      <div className="pf-narrative-track" role="list">
        {beatOrder.map((beat, index) => {
          const slideNumber = index + 1;
          const meta = storeSlideBeatMeta[beat];
          const isActive = activeSlideNumber === slideNumber;

          return (
            <button
              key={beat}
              type="button"
              role="listitem"
              className={`pf-narrative-step ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectSlide?.(slideNumber)}
              title={meta.conversionGoal}
            >
              <span className="pf-narrative-step-num">{slideNumber}</span>
              <span className="pf-narrative-step-label">{meta.label}</span>
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
