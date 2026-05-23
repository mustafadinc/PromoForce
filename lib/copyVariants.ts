import type { CopyVariant, CopyVariantId } from "@/lib/campaignTypes";

export function normalizeHashtags(hashtags: string[]) {
  return hashtags.map((tag) => String(tag).replace(/^#/, "").trim()).filter(Boolean).slice(0, 8);
}

export function buildCopyVariants(
  hook: string,
  caption: string,
  hashtags: string[],
  variantB?: Partial<CopyVariant>,
): CopyVariant[] {
  const tags = normalizeHashtags(hashtags);

  return [
    { id: "A", hook, caption, hashtags: tags },
    {
      id: "B",
      hook: String(variantB?.hook || `${hook} (alt angle)`).trim(),
      caption: String(variantB?.caption || caption).trim(),
      hashtags: normalizeHashtags(variantB?.hashtags || tags),
    },
  ];
}

export function getActiveCopy(item: {
  hook: string;
  caption: string;
  hashtags: string[];
  copyVariants: CopyVariant[];
  selectedVariantId: CopyVariantId;
}) {
  const selected = item.copyVariants.find((variant) => variant.id === item.selectedVariantId);
  return selected || item.copyVariants[0] || { id: "A" as const, hook: item.hook, caption: item.caption, hashtags: item.hashtags };
}

export function selectCopyVariant<
  T extends {
    hook: string;
    caption: string;
    hashtags: string[];
    copyVariants: CopyVariant[];
    selectedVariantId: CopyVariantId;
  },
>(item: T, variantId: CopyVariantId): T {
  const variant = item.copyVariants.find((entry) => entry.id === variantId);
  if (!variant) return { ...item, selectedVariantId: variantId };

  return {
    ...item,
    selectedVariantId: variantId,
    hook: variant.hook,
    caption: variant.caption,
    hashtags: [...variant.hashtags],
  };
}

export function updateCopyField<
  T extends {
    hook: string;
    caption: string;
    hashtags: string[];
    copyVariants: CopyVariant[];
    selectedVariantId: CopyVariantId;
  },
>(item: T, field: "hook" | "caption" | "hashtags", value: string | string[]): T {
  const next = { ...item, copyVariants: [...item.copyVariants] };

  if (field === "hashtags") {
    const hashtags = normalizeHashtags(Array.isArray(value) ? value : String(value).split(/[\s,]+/));
    next.hashtags = hashtags;
  } else {
    next[field] = String(value);
  }

  const index = next.copyVariants.findIndex((variant) => variant.id === next.selectedVariantId);
  const variantIndex = index >= 0 ? index : 0;

  next.copyVariants[variantIndex] = {
    ...next.copyVariants[variantIndex],
    id: next.selectedVariantId,
    hook: next.hook,
    caption: next.caption,
    hashtags: [...next.hashtags],
  };

  return next;
}

export function ensureCopyVariants<
  T extends {
    hook: string;
    caption: string;
    hashtags: string[];
    copyVariants?: CopyVariant[];
    selectedVariantId?: CopyVariantId;
  },
>(item: T): T & { copyVariants: CopyVariant[]; selectedVariantId: CopyVariantId } {
  const copyVariants =
    item.copyVariants?.length === 2
      ? item.copyVariants.map((variant) => ({
          ...variant,
          hashtags: normalizeHashtags(variant.hashtags),
        }))
      : buildCopyVariants(item.hook, item.caption, item.hashtags);

  const selectedVariantId = item.selectedVariantId || "A";
  return selectCopyVariant(
    {
      ...item,
      copyVariants,
      selectedVariantId,
    },
    selectedVariantId,
  );
}
