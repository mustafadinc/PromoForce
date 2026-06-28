"use client";

import { useEffect, useRef, useState } from "react";
import type { MockupPose } from "@/lib/campaignTypes";
import {
  computeAssetDevicePlacement,
  getSceneMockupAsset,
  isSceneMockup,
  mockupAssetForSlide,
  normalizeMockupAssetId,
  usesAssetMockup,
  type MockupAssetId,
} from "@/lib/assetMockup";
import { getMockupPosePreviewLayout } from "@/lib/mockupPosePreviewLayout";
import { drawAssetDevicePreview } from "@/lib/previewAssetDevice";
import { drawSceneMockupPreview } from "@/lib/previewSceneMockup";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import { METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import { perspectiveFrameRasterSize } from "@/lib/metallicIPhoneFramePerspective";
import { drawPerspectiveDevicePreview } from "@/lib/previewPerspectiveDevice";

type MockupPoseCompositePreviewProps = {
  pose: MockupPose;
  screenshotUrl: string | null;
  mockupColor?: string;
  mockupAssetId?: MockupAssetId | null;
  slideNumber?: number;
};

export function MockupPoseCompositePreview({
  pose,
  screenshotUrl,
  mockupColor,
  mockupAssetId,
  slideNumber,
}: MockupPoseCompositePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const resolvedAssetId = normalizeMockupAssetId(
    mockupAssetId ?? (slideNumber ? mockupAssetForSlide(slideNumber) : undefined),
  );
  const isScene = isSceneMockup(resolvedAssetId);

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
    if (!canvas || size.w < 8 || size.h < 8) return;

    if (isScene) {
      const asset = getSceneMockupAsset(resolvedAssetId);
      if (!asset) return;

      let cancelled = false;
      (async () => {
        const ctx = canvas.getContext("2d");
        if (!ctx || cancelled) return;
        canvas.width = size.w;
        canvas.height = size.h;
        ctx.clearRect(0, 0, size.w, size.h);
        await drawSceneMockupPreview(ctx, screenshotUrl, asset, size.w, size.h);
      })().catch(() => {
        /* ignore */
      });

      return () => {
        cancelled = true;
      };
    }

    if (!screenshotUrl) return;

    const isAsset = usesAssetMockup(pose.orientation, resolvedAssetId);
    const isPersp = usesPerspectiveMockup(pose.orientation);
    if (!isAsset && !isPersp) return;

    let cancelled = false;

    (async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;

      canvas.width = size.w;
      canvas.height = size.h;
      ctx.clearRect(0, 0, size.w, size.h);

      const layout = getMockupPosePreviewLayout(pose);
      const placed = computeAssetDevicePlacement({
        canvasW: size.w,
        canvasH: size.h,
        placement: layout.anchor,
        targetDeviceW: Math.round(size.w * layout.phoneWidthPct),
        topReserve: Math.round((size.h * layout.headlineReservePct) / 100),
        bottomMargin: Math.round((size.h * layout.phoneBottomPct) / 100),
        edgeInset: Math.round((size.w * layout.edgeInsetPct) / 100),
        mockupAssetId: resolvedAssetId,
      });

      if (cancelled) return;

      if (isAsset) {
        await drawAssetDevicePreview(
          ctx,
          screenshotUrl,
          pose.orientation,
          placed.deviceW,
          placed.deviceH,
          placed.originX,
          placed.originY,
        );
      } else {
        const { geometry } = perspectiveFrameRasterSize(pose.orientation, placed.deviceW);
        const scale = placed.deviceW / METALLIC_FRAME_W;
        const stackX = placed.originX - geometry.bounds.minX * scale;
        const stackY = placed.originY - geometry.bounds.minY * scale;
        const finalColor =
          mockupColor ?? (resolvedAssetId === "iphone-17-pro-cosmic-orange" ? "cosmic-orange" : undefined);

        await drawPerspectiveDevicePreview(
          ctx,
          screenshotUrl,
          pose.orientation,
          placed.deviceW,
          stackX,
          stackY,
          finalColor,
        );
      }
    })().catch(() => {
      /* ignore load errors */
    });

    return () => {
      cancelled = true;
    };
  }, [pose, screenshotUrl, size.w, size.h, mockupColor, resolvedAssetId, isScene]);

  const isAsset = usesAssetMockup(pose.orientation, resolvedAssetId);
  const isPersp = usesPerspectiveMockup(pose.orientation);
  if (!isScene && (!isAsset && !isPersp || !screenshotUrl)) return null;
  if (isScene && !getSceneMockupAsset(resolvedAssetId)) return null;

  return (
    <div
      ref={hostRef}
      className={`mockup-pose-preview-composite-host${isScene ? " is-scene-mockup" : ""}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="mockup-pose-preview-composite-canvas" />
    </div>
  );
}
