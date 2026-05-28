"use client";

import { useEffect, useRef, useState } from "react";
import type { MockupPose } from "@/lib/campaignTypes";
import { computeAssetDevicePlacement, usesAssetMockup } from "@/lib/assetMockup";
import { getMockupPosePreviewLayout } from "@/lib/mockupPosePreviewLayout";
import { drawAssetDevicePreview } from "@/lib/previewAssetDevice";

type MockupPoseCompositePreviewProps = {
  pose: MockupPose;
  screenshotUrl: string | null;
};

export function MockupPoseCompositePreview({ pose, screenshotUrl }: MockupPoseCompositePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const w = Math.round(host.clientWidth);
      const h = Math.round(host.clientHeight);
      if (w > 0 && h > 0) setSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screenshotUrl || size.w < 8 || size.h < 8) return;
    if (!usesAssetMockup(pose.orientation)) return;

    let cancelled = false;

    (async () => {
      const layout = getMockupPosePreviewLayout(pose);
      const placed = computeAssetDevicePlacement({
        canvasW: size.w,
        canvasH: size.h,
        placement: layout.anchor,
        targetDeviceW: Math.round(size.w * layout.phoneWidthPct),
        topReserve: Math.round((size.h * layout.headlineReservePct) / 100),
        bottomMargin: Math.round((size.h * layout.phoneBottomPct) / 100),
        edgeInset: Math.round((size.w * layout.edgeInsetPct) / 100),
      });

      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;

      canvas.width = size.w;
      canvas.height = size.h;
      ctx.clearRect(0, 0, size.w, size.h);

      await drawAssetDevicePreview(
        ctx,
        screenshotUrl,
        pose.orientation,
        placed.deviceW,
        placed.deviceH,
        placed.originX,
        placed.originY,
      );
    })().catch(() => {
      /* ignore load errors */
    });

    return () => {
      cancelled = true;
    };
  }, [pose, screenshotUrl, size.w, size.h]);

  if (!usesAssetMockup(pose.orientation) || !screenshotUrl) return null;

  return (
    <div ref={hostRef} className="mockup-pose-preview-composite-host" aria-hidden="true">
      <canvas ref={canvasRef} className="mockup-pose-preview-composite-canvas" />
    </div>
  );
}
