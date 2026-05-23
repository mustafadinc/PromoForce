"use client";

type ScreenshotOption = {
  index: number;
  previewUrl: string;
};

type CompactScreenshotPickerProps = {
  label?: string;
  screenshots: ScreenshotOption[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
  rationale?: string;
};

const THUMB_SIZE = 44;

export function CompactScreenshotPicker({
  label = "Screen",
  screenshots,
  selectedIndex,
  onSelect,
  disabled,
  rationale,
}: CompactScreenshotPickerProps) {
  if (!screenshots.length) {
    return (
      <div className="pf-compact-screens">
        <span className="field-label">{label}</span>
        <p className="text-only-note">No screenshots uploaded.</p>
      </div>
    );
  }

  const selected =
    selectedIndex !== null && selectedIndex !== undefined
      ? screenshots.find((shot) => shot.index === selectedIndex) ?? screenshots[0]
      : screenshots[0];

  return (
    <div className="pf-compact-screens">
      <div className="pf-compact-screens-head">
        <span className="field-label">{label}</span>
        {selected ? (
          <span className="pf-compact-screens-selected">
            Screen {selected.index + 1} selected
          </span>
        ) : null}
      </div>

      <div className="pf-compact-screens-row" role="listbox" aria-label={label}>
        {screenshots.map((shot) => {
          const isSelected = selectedIndex === shot.index;
          return (
            <button
              key={shot.index}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`Screen ${shot.index + 1}`}
              disabled={disabled}
              className={`pf-compact-screen-thumb ${isSelected ? "is-selected" : ""}`}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                minWidth: THUMB_SIZE,
                maxWidth: THUMB_SIZE,
                minHeight: THUMB_SIZE,
                maxHeight: THUMB_SIZE,
                backgroundImage: `url("${shot.previewUrl}")`,
              }}
              onClick={() => onSelect(shot.index)}
              title={`Screen ${shot.index + 1}`}
            >
              <span className="pf-compact-screen-num">{shot.index + 1}</span>
            </button>
          );
        })}
      </div>

      {rationale ? <p className="screenshot-rationale pf-compact-screens-note">{rationale}</p> : null}
    </div>
  );
}
