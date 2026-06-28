"use client";

import type { StoreSlidePlan, StrategyBrief, VisualCompositionScores, VisualRecommendation } from "@/lib/campaignTypes";
import { RETAKE_THRESHOLDS } from "@/lib/visualArtDirector/compositionScore";

type VisualCompositionPanelProps = {
  slide: StoreSlidePlan;
  strategy: StrategyBrief;
};

const SCORE_ROWS: Array<{ key: keyof VisualCompositionScores; label: string; threshold: number }> = [
  { key: "mockupReadability", label: "Mockup readability", threshold: RETAKE_THRESHOLDS.mockupReadability },
  { key: "mockupComposition", label: "Composition balance", threshold: 75 },
  { key: "visualAppeal", label: "Visual appeal", threshold: RETAKE_THRESHOLDS.visualAppeal },
  { key: "textReadability", label: "Text readability", threshold: RETAKE_THRESHOLDS.textReadability },
  { key: "backgroundSupport", label: "Background support", threshold: RETAKE_THRESHOLDS.backgroundSupport },
  { key: "brandHarmony", label: "Brand harmony", threshold: 70 },
  { key: "thumbnailClarity", label: "Thumbnail clarity", threshold: 80 },
  { key: "phoneCropSafety", label: "Crop safety", threshold: RETAKE_THRESHOLDS.phoneCropSafety },
];

const FIELD_LABELS: Record<VisualRecommendation["field"], string> = {
  angle: "Recommended angle",
  size: "Recommended size",
  position: "Recommended position",
  background: "Recommended background",
  mockupAsset: "Recommended mockup",
  layout: "Recommended layout",
  text: "Text layout",
};

function scoreTone(score: number, threshold: number): "good" | "warn" | "bad" {
  if (score >= threshold) return "good";
  if (score >= threshold - 12) return "warn";
  return "bad";
}

export function VisualCompositionPanel({ slide, strategy }: VisualCompositionPanelProps) {
  const scores = slide.visualScores;
  const recommendations = slide.visualRecommendations ?? [];
  const setPlan = strategy.visualCompositionPlan;

  if (!scores && recommendations.length === 0) return null;

  return (
    <section className="visual-composition-panel">
      <div className="visual-composition-head">
        <h4 className="pf-form-section-title">Visual composition</h4>
        {slide.visualRetakeRequired ? (
          <span className="rating-badge rating-retake">Retake suggested</span>
        ) : scores ? (
          <span className="rating-badge rating-great">Art director OK</span>
        ) : null}
      </div>

      <p className="pf-form-section-hint">
        Product-first mockup layout — angle, size, position, and background chosen for App Store readability, not
        copywriting.
      </p>

      {setPlan && slide.slideNumber === 1 ? (
        <p className="visual-set-variety">
          Set variety {setPlan.setVarietyScore}/100
          {setPlan.brandAccentRole === "accent" ? " · brand color as accent" : ""}
        </p>
      ) : null}

      {scores ? (
        <ul className="visual-score-list">
          {SCORE_ROWS.map(({ key, label, threshold }) => {
            const value = scores[key];
            if (typeof value !== "number") return null;
            const tone = scoreTone(value, threshold);
            return (
              <li key={key} className="visual-score-row">
                <span className="visual-score-label">{label}</span>
                <div className="visual-score-track" aria-hidden>
                  <div className={`visual-score-fill score-${tone}`} style={{ width: `${value}%` }} />
                </div>
                <span className={`visual-score-value score-${tone}`}>{value}</span>
              </li>
            );
          })}
          {typeof scores.setVariety === "number" ? (
            <li className="visual-score-row">
              <span className="visual-score-label">Set variety</span>
              <div className="visual-score-track" aria-hidden>
                <div
                  className={`visual-score-fill score-${scoreTone(scores.setVariety, RETAKE_THRESHOLDS.setVariety)}`}
                  style={{ width: `${scores.setVariety}%` }}
                />
              </div>
              <span
                className={`visual-score-value score-${scoreTone(scores.setVariety, RETAKE_THRESHOLDS.setVariety)}`}
              >
                {scores.setVariety}
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}

      {slide.visualRetakeReasons?.length ? (
        <ul className="visual-retake-list">
          {slide.visualRetakeReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      {setPlan?.setVarietyIssues.length && slide.slideNumber === 1 ? (
        <ul className="visual-retake-list visual-set-issues">
          {setPlan.setVarietyIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {recommendations.length ? (
        <div className="visual-recommendations">
          <h5>Automatic recommendations</h5>
          <ul>
            {recommendations.map((rec) => (
              <li key={`${rec.field}-${rec.recommended}`}>
                <strong>{FIELD_LABELS[rec.field]}:</strong> {rec.recommended}
                <span className="visual-rec-rationale"> — {rec.rationale}</span>
                {rec.avoid ? <span className="visual-rec-avoid"> Avoid: {rec.avoid}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
