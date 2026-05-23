"use client";

import { RefreshCw } from "lucide-react";

type ExportStatusStripProps = {
  isGenerating: boolean;
  progressLabel?: string;
  complete?: boolean;
  completeTitle?: string;
  completeMessage?: string;
};

export function ExportStatusStrip({
  isGenerating,
  progressLabel,
  complete = false,
  completeTitle = "Export complete",
  completeMessage = "Phase 4 compositing completed — assets ready for review.",
}: ExportStatusStripProps) {
  if (!isGenerating && !complete) return null;

  const progress = isGenerating ? 55 : 100;

  return (
    <div className={`pf-export-strip ${isGenerating ? "is-generating" : "is-complete"}`} role="status">
      <div className="pf-export-strip-copy">
        <RefreshCw className={`pf-export-strip-icon ${isGenerating ? "is-spinning" : ""}`} aria-hidden="true" />
        <div>
          <h4>{isGenerating ? "Generating assets" : completeTitle}</h4>
          <p>{isGenerating ? progressLabel || "Working on your campaign..." : completeMessage}</p>
        </div>
      </div>
      <div className="pf-export-strip-bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
