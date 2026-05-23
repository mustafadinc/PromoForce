"use client";

import { IPhone17ProMockup } from "@/components/IPhone17ProMockup";

type MockupSize = "sm" | "md" | "lg" | "xl";

type UploadedScreenMockupRowProps = {
  screenshots: Array<{ index: number; previewUrl: string }>;
  size?: MockupSize;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
};

export function galleryMockupSize(count: number): MockupSize {
  if (count <= 1) return "xl";
  if (count <= 2) return "lg";
  if (count <= 3) return "lg";
  return "md";
}

export function UploadedScreenMockupRow({
  screenshots,
  size,
  selectedIndex,
  onSelect,
}: UploadedScreenMockupRowProps) {
  const mockupSize = size ?? galleryMockupSize(screenshots.length);

  return (
    <div className="pf-iphone-mockup-row" role="list" aria-label="Uploaded screens">
      {screenshots.map((shot) => (
        <IPhone17ProMockup
          key={shot.index}
          previewUrl={shot.previewUrl}
          label={`Screen ${shot.index + 1}`}
          size={mockupSize}
          selected={selectedIndex === shot.index}
          onClick={onSelect ? () => onSelect(shot.index) : undefined}
        />
      ))}
    </div>
  );
}
