"use client";

import type { MockupPose } from "@/lib/campaignTypes";
import {
  getMockupPosePreviewLayout,
  getPreviewUprightPhoneStyle,
} from "@/lib/mockupPosePreviewLayout";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import { MockupPoseCompositePreview } from "@/components/MockupPoseCompositePreview";

type MockupPosePreviewProps = {
  pose: MockupPose;
  headline?: string;
  subheadline?: string;
  screenshotUrl?: string | null;
  /** Inline thumbnail beside pose controls — avoids a tall sidebar stack. */
  compact?: boolean;
};

export function MockupPosePreview({
  pose,
  headline,
  subheadline,
  screenshotUrl,
  compact,
}: MockupPosePreviewProps) {
  const layout = getMockupPosePreviewLayout(pose);
  const has3d = usesPerspectiveMockup(pose.orientation);
  return (
    <div
      className={`mockup-pose-preview${compact ? " is-compact" : ""}`}
      aria-label="Rough layout preview"
    >
      <span className="mockup-pose-preview-label">Layout preview</span>
      <div className={`mockup-pose-preview-canvas placement-${pose.placement}`}>
        <div className="mockup-pose-preview-headline-zone">
          {headline ? (
            <p className="mockup-pose-preview-headline">{headline}</p>
          ) : (
            <span className="mockup-pose-preview-placeholder">Headline</span>
          )}
          {subheadline ? <p className="mockup-pose-preview-sub">{subheadline}</p> : null}
        </div>

        {layout.showLeftBg ? (
          <div className="mockup-pose-preview-bg-hint is-left" aria-hidden="true">
            <span>Background</span>
          </div>
        ) : null}
        {layout.showRightBg ? (
          <div className="mockup-pose-preview-bg-hint is-right" aria-hidden="true">
            <span>Background</span>
          </div>
        ) : null}

        {has3d ? (
          <>
            <div className="mockup-pose-preview-glow" aria-hidden="true" />
            <MockupPoseCompositePreview pose={pose} screenshotUrl={screenshotUrl ?? null} />
          </>
        ) : null}

        {!has3d ? (
          <div
            className={`mockup-pose-preview-phone placement-${pose.placement} is-anchor-${layout.anchor}`}
            style={getPreviewUprightPhoneStyle(layout)}
          >
            <div className="mockup-pose-preview-device">
              {screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={screenshotUrl} alt="" className="mockup-pose-preview-screen" />
              ) : (
                <div className="mockup-pose-preview-screen is-empty" />
              )}
              <div className="mockup-pose-preview-bezel" aria-hidden="true" />
            </div>
          </div>
        ) : null}
      </div>
      {compact ? null : (
        <p className="mockup-pose-preview-footnote">
          Approximate composite layout — not the final render.
        </p>
      )}
    </div>
  );
}
