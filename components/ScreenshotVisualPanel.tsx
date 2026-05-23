"use client";

import { CompactScreenshotPicker } from "@/components/CompactScreenshotPicker";
import { IPhone17ProMockup } from "@/components/IPhone17ProMockup";
import type { ScreenshotUsage, SocialPlatform } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { screenshotUsageOptions } from "@/lib/normalizeSocialAssetEdit";

type ScreenshotOption = {
  index: number;
  previewUrl: string;
};

type ScreenshotVisualPanelProps = {
  screenshots: ScreenshotOption[];
  screenshotUsage: ScreenshotUsage;
  screenshotIndex: number | null;
  platform?: SocialPlatform;
  visualStyle?: string;
  rationale?: string;
  isGenerating: boolean;
  showVisualDirection?: boolean;
  onUsageChange: (usage: ScreenshotUsage) => void;
  onScreenshotSelect: (index: number) => void;
  onVisualStyleChange?: (value: string) => void;
};

export function ScreenshotVisualPanel({
  screenshots,
  screenshotUsage,
  screenshotIndex,
  platform,
  visualStyle = "",
  rationale,
  isGenerating,
  showVisualDirection = true,
  onUsageChange,
  onScreenshotSelect,
  onVisualStyleChange,
}: ScreenshotVisualPanelProps) {
  const usesScreenshot = screenshotUsage !== "none" && screenshots.length > 0;
  const activeIndex =
    usesScreenshot && screenshotIndex !== null
      ? screenshotIndex
      : usesScreenshot
        ? screenshots[0]?.index ?? null
        : null;
  const selected =
    activeIndex !== null
      ? (screenshots.find((shot) => shot.index === activeIndex) ?? screenshots[0])
      : null;

  return (
    <aside className="pf-screenshot-visual-panel">
      <div className="pf-screenshot-visual-panel-head">
        <h4 className="pf-form-section-title">Screenshot & visual</h4>
        {platform ? <span className="format-badge">{socialPlatformMeta[platform].formatLabel}</span> : null}
      </div>

      <label className="field">
        <span>Screenshot usage</span>
        <select
          value={screenshotUsage}
          onChange={(event) => onUsageChange(event.target.value as ScreenshotUsage)}
          disabled={isGenerating || screenshots.length === 0}
        >
          {screenshotUsageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {usesScreenshot && screenshots.length > 0 ? (
        <>
          <label className="field">
            <span>Screen to use</span>
            <select
              value={activeIndex ?? screenshots[0].index}
              onChange={(event) => onScreenshotSelect(Number(event.target.value))}
              disabled={isGenerating}
            >
              {screenshots.map((shot) => (
                <option key={shot.index} value={shot.index}>
                  Screen {shot.index + 1}
                </option>
              ))}
            </select>
          </label>

          <CompactScreenshotPicker
            label="Pick a screen"
            screenshots={screenshots}
            selectedIndex={activeIndex}
            onSelect={onScreenshotSelect}
            disabled={isGenerating}
          />
        </>
      ) : null}

      <div className="pf-device-preview-wrap">
        {usesScreenshot && selected ? (
          <IPhone17ProMockup
            previewUrl={selected.previewUrl}
            label={`Screen ${selected.index + 1}`}
            size="md"
          />
        ) : (
          <div className="pf-device-empty">
            <span className="pf-device-empty-icon" aria-hidden="true">
              ◻
            </span>
            <p>Text-only creative — no app screenshot in this post.</p>
          </div>
        )}
      </div>

      {usesScreenshot && rationale ? (
        <p className="screenshot-rationale pf-compact-screens-note">{rationale}</p>
      ) : null}

      {showVisualDirection && onVisualStyleChange ? (
        <label className="field">
          <span>Visual direction (optional)</span>
          <textarea
            rows={3}
            value={visualStyle}
            onChange={(event) => onVisualStyleChange(event.target.value)}
            disabled={isGenerating}
            placeholder="Background mood, layout notes..."
          />
        </label>
      ) : null}
    </aside>
  );
}
