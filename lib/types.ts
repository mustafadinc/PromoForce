export const styleOptions = [
  "Minimal SaaS",
  "Modern Gradient",
  "Dark Tech",
  "App Store Launch",
  "Fun & Colorful",
] as const;

export type StyleName = (typeof styleOptions)[number];

export type PromoFormValues = {
  appName: string;
  category: string;
  description: string;
  targetAudience: string;
  style: StyleName;
};
