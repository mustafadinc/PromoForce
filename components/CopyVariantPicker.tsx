"use client";

import type { CopyVariantId } from "@/lib/campaignTypes";
import { formatSocialPostCopy } from "@/lib/buildSocialAssetPrompt";

type CopyVariantPickerProps = {
  selectedVariantId: CopyVariantId;
  variantA: { hook: string; caption: string; hashtags: string[] };
  variantB: { hook: string; caption: string; hashtags: string[] };
  disabled?: boolean;
  onSelect: (variantId: CopyVariantId) => void;
};

export function CopyVariantPicker({
  selectedVariantId,
  variantA,
  variantB,
  disabled,
  onSelect,
}: CopyVariantPickerProps) {
  const variants = [
    { id: "A" as const, label: "Variant A", copy: variantA },
    { id: "B" as const, label: "Variant B", copy: variantB },
  ];

  return (
    <div className="variant-picker">
      <span className="field-label">A/B caption test</span>
      <div className="variant-tabs">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            className={`variant-tab ${selectedVariantId === variant.id ? "is-active" : ""}`}
            disabled={disabled}
            onClick={() => onSelect(variant.id)}
          >
            {variant.label}
          </button>
        ))}
      </div>
      <pre className="post-copy-preview variant-preview">
        {formatSocialPostCopy(variants.find((variant) => variant.id === selectedVariantId)?.copy || variantA)}
      </pre>
    </div>
  );
}
