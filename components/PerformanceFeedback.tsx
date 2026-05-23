"use client";

import { useState } from "react";
import type { CopyVariantId, PerformanceRating } from "@/lib/campaignTypes";
import { createPerformanceRecord, loadPerformanceRecords, savePerformanceRecord } from "@/lib/performanceMemory";

type PerformanceFeedbackProps = {
  appName: string;
  itemId: string;
  platform: string;
  hook: string;
  usedScreenshot: boolean;
  variantId: CopyVariantId;
};

const ratingOptions: Array<{ value: PerformanceRating; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function PerformanceFeedback({
  appName,
  itemId,
  platform,
  hook,
  usedScreenshot,
  variantId,
}: PerformanceFeedbackProps) {
  const existing = loadPerformanceRecords(appName).find((record) => record.id === itemId);
  const [savedRating, setSavedRating] = useState<PerformanceRating | null>(existing?.rating || null);

  const saveRating = (rating: PerformanceRating) => {
    savePerformanceRecord(
      createPerformanceRecord({
        appName,
        platform,
        hook,
        rating,
        usedScreenshot,
        variantId,
        itemId,
      }),
    );
    setSavedRating(rating);
  };

  return (
    <div className="performance-feedback">
      <span className="field-label">Rate performance (feeds next campaign)</span>
      <div className="performance-actions">
        {ratingOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`performance-chip ${savedRating === option.value ? "is-active" : ""}`}
            onClick={() => saveRating(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {savedRating ? <p className="performance-saved">Saved — AI will use this in future strategies.</p> : null}
    </div>
  );
}
