"use client";

import type { MockupPose } from "@/lib/campaignTypes";
import {
  getMockupPosePreviewLayout,
  getPreviewUprightPhoneStyle,
} from "@/lib/mockupPosePreviewLayout";
import { isSceneMockup, mockupAssetForSlide, normalizeMockupAssetId, usesAssetMockup, type MockupAssetId } from "@/lib/assetMockup";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import { MockupPoseCompositePreview } from "@/components/MockupPoseCompositePreview";

type MockupPosePreviewProps = {
  pose: MockupPose;
  headline?: string;
  subheadline?: string;
  screenshotUrl?: string | null;
  /** Inline thumbnail beside pose controls — avoids a tall sidebar stack. */
  compact?: boolean;
  mockupColor?: string;
  mockupAssetId?: MockupAssetId | null;
  slideNumber?: number;
};

export function MockupPosePreview({
  pose,
  headline,
  subheadline,
  screenshotUrl,
  compact,
  mockupColor,
  mockupAssetId,
  slideNumber,
}: MockupPosePreviewProps) {
  const resolvedAssetId = normalizeMockupAssetId(
    mockupAssetId ?? (slideNumber ? mockupAssetForSlide(slideNumber) : undefined),
  );
  const layout = getMockupPosePreviewLayout(pose);
  const isScene = isSceneMockup(resolvedAssetId);
  const hasShowcaseDevice = usesAssetMockup(pose.orientation, resolvedAssetId);
  const has3d = isScene || hasShowcaseDevice || usesPerspectiveMockup(pose.orientation);
  return (
    <div
      className={`mockup-pose-preview${compact ? " is-compact" : ""}${isScene ? " is-scene-mockup" : ""}`}
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

        {has3d && !isScene ? (
          <div className="mockup-pose-preview-glow" aria-hidden="true" />
        ) : null}
        {has3d ? (
          <MockupPoseCompositePreview
            pose={pose}
            screenshotUrl={screenshotUrl ?? null}
            mockupColor={mockupColor}
            mockupAssetId={resolvedAssetId}
            slideNumber={slideNumber}
          />
        ) : null}

        {!has3d && !isScene ? (
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
          {isScene
            ? "Transparent iPhone 16 mockup on AI background — matches export composite."
            : "Approximate composite layout — not the final render."}
        </p>
      )}
    </div>
  );
}
