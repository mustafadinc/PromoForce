"use client";

type GenerationBannerProps = {
  progressLabel: string;
  onCancel: () => void;
};

export function GenerationBanner({ progressLabel, onCancel }: GenerationBannerProps) {
  return (
    <div className="generation-banner" role="status" aria-live="polite">
      <div className="generation-banner-copy">
        <span className="generation-banner-spinner" aria-hidden="true" />
        <p>{progressLabel || "Generating..."}</p>
      </div>
      <button className="cancel-action generation-banner-cancel" type="button" onClick={onCancel}>
        Cancel Generation
      </button>
    </div>
  );
}
