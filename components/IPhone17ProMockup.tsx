"use client";

import { useId, useMemo } from "react";
import {
  METALLIC_FRAME_H,
  METALLIC_FRAME_W,
  generateMetallicIPhoneFrameSvg,
} from "@/lib/metallicIPhoneFrame";
import { getMockupScreenStyles } from "@/lib/mockupScreenFit";

type IPhone17ProMockupProps = {
  previewUrl: string;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  selected?: boolean;
  onClick?: () => void;
};

const sizePx: Record<NonNullable<IPhone17ProMockupProps["size"]>, number> = {
  sm: 240,
  md: 300,
  lg: 360,
  xl: 440,
};

export function IPhone17ProMockup({
  previewUrl,
  label,
  size = "md",
  selected,
  onClick,
}: IPhone17ProMockupProps) {
  const uid = useId().replace(/:/g, "");
  const width = sizePx[size];
  const height = Math.round(width * (METALLIC_FRAME_H / METALLIC_FRAME_W));
  const screenStyle = getMockupScreenStyles(width);
  const Tag = onClick ? "button" : "figure";

  const frameMarkup = useMemo(
    () =>
      generateMetallicIPhoneFrameSvg({
        idPrefix: uid,
        width,
        height,
        includeShadow: true,
      }),
    [uid, width, height],
  );

  const interactiveProps = onClick
    ? {
        type: "button" as const,
        onClick,
        "aria-pressed": selected,
      }
    : {};

  return (
    <Tag
      className={`iphone-17-pro iphone-17-pro--${size} ${selected ? "is-selected" : ""} ${onClick ? "is-interactive" : ""}`}
      style={{ width }}
      aria-label={label ? `${label} preview` : "iPhone 17 Pro preview"}
      {...interactiveProps}
    >
      <div className="iphone-17-pro-stage" style={{ width, height }}>
        <div className="iphone-17-pro-screen-wrap" style={screenStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="iphone-17-pro-screen" />
        </div>
        <div
          className="iphone-17-pro-frame"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: frameMarkup }}
        />
        {selected ? <span className="iphone-17-pro-selection-ring" aria-hidden="true" /> : null}
      </div>

      {label ? <span className="iphone-17-pro-label">{label}</span> : null}
    </Tag>
  );
}
