export type CampaignType = "app_store" | "social_launch" | "marketing_autopilot";

export const campaignTypeOptions: Array<{ value: CampaignType; label: string; description: string }> = [
  {
    value: "app_store",
    label: "App Store Set",
    description: "5 portrait screenshots for the App Store listing (1290×2796 export).",
  },
  {
    value: "social_launch",
    label: "Social Launch Pack",
    description: "Instagram, Story, and X posts with captions and hashtags.",
  },
  {
    value: "marketing_autopilot",
    label: "Marketing Autopilot",
    description: "7 or 30-day AI content calendar with daily posts and brand memory.",
  },
];

export type CalendarDuration = 7 | 30;

export type AutopilotConfig = {
  duration: CalendarDuration;
  startDate: string;
};

export type BrandMemory = {
  appName: string;
  visualTheme: string;
  brandVoice: string;
  recentPosts: Array<{
    day: number;
    platform: SocialPlatform;
    headline: string;
    hook: string;
    usedScreenshot: boolean;
  }>;
};

export type CopyVariantId = "A" | "B";

export type CopyVariant = {
  id: CopyVariantId;
  hook: string;
  caption: string;
  hashtags: string[];
};

export type PerformanceRating = "low" | "medium" | "high";

export type PerformanceRecord = {
  id: string;
  appName: string;
  platform: string;
  hook: string;
  rating: PerformanceRating;
  usedScreenshot: boolean;
  variantId: CopyVariantId;
  recordedAt: string;
};

export type SavedAppWorkspace = {
  id: string;
  profile: AppProfile;
  savedAt: string;
};

export type UsagePlan = "free" | "pro";

export const PLAN_LIMITS: Record<UsagePlan, { dailyGenerations: number; label: string }> = {
  free: { dailyGenerations: 15, label: "Free" },
  pro: { dailyGenerations: 500, label: "Pro" },
};

export type AppProfile = {
  appName: string;
  category: string;
  description: string;
  targetAudience: string;
};

export type SlideRole = "hero" | "feature" | "cta";

export type ScreenshotUsage = "hero_mockup" | "feature_mockup" | "none";

export type ScreenshotUiTone = "light" | "dark" | "mixed";

export type ScreenshotColorProfile = {
  uiTone: ScreenshotUiTone;
  averageLuminance: number;
  dominantColors: string[];
  accentColor: string;
  secondaryColor: string;
  backgroundBase: string;
  harmonyGuidance: string;
};

export type StoreSlideBeat =
  | "hook"
  | "problem_outcome"
  | "feature_benefit"
  | "social_proof"
  | "download_cta";

export type BackgroundTreatment =
  | "lifestyle_with_person"
  | "lifestyle_environment"
  | "abstract_brand"
  | "cta_brand";

export type SlideLayoutStyle = "hero_branded" | "lifestyle_focus" | "feature_pills" | "cta_minimal";

export type SetMode = "lifestyle" | "solid" | "hybrid";

export type ScreenshotQualityRating = "great" | "usable" | "retake";

export type LockedTypography = {
  verbSize: number;
  descriptorSize: number;
  subSize: number;
};

export type ScreenshotAssessment = {
  index: number;
  rating: ScreenshotQualityRating;
  issues: string[];
  retakeGuidance?: string;
  description?: string;
};

export type BackgroundScene = {
  id: string;
  label: string;
  treatment: BackgroundTreatment;
  sceneDescription: string;
  reuseRationale: string;
  sharedBySlides: number[];
};

export type StoreSlidePlan = {
  slideNumber: number;
  role: SlideRole;
  asoBeat: StoreSlideBeat;
  conversionGoal: string;
  headline: string;
  headlineVerb: string;
  headlineDescriptor: string;
  subheadline: string;
  screenshotIndex: number | null;
  screenshotUsage: ScreenshotUsage;
  screenshotRationale: string;
  screenshotRating?: ScreenshotQualityRating;
  screenshotIssues?: string[];
  retakeGuidance?: string;
  visualStyle: string;
  visualVariant: string;
  backgroundSceneId: string | null;
  backgroundTreatment: BackgroundTreatment;
  layoutStyle: SlideLayoutStyle;
  headlineAccent: string;
  featureHighlights: string[];
  showAppBranding: boolean;
  backgroundRationale: string;
  breakoutPanelDescription?: string;
};

export type StrategyBrief = {
  positioning: string;
  primaryMessage: string;
  targetAudience: string;
  narrativeArc: string;
  designSystem: string;
  visualTheme: string;
  accentColor: string;
  brandColor: string;
  setMode: SetMode;
  styleAnchorSlide: number;
  backgroundScenes: BackgroundScene[];
  screenshotAssessments: ScreenshotAssessment[];
  slides: StoreSlidePlan[];
  colorProfile?: ScreenshotColorProfile | null;
};

export type GeneratedSlideVariant = {
  id: string;
  dataUrl: string;
  prompt: string;
};

export type GeneratedSlide = {
  slideNumber: number;
  role: SlideRole;
  headline: string;
  subheadline: string;
  dataUrl: string;
  prompt: string;
  backgroundDataUrl?: string;
  mockupColor?: string;
  renderVersion?: number;
  variants?: GeneratedSlideVariant[];
  selectedVariantId?: string;
};

export type StoreSlideRegenerateMode = "full" | "background" | "composite";

export type StoreSlideRegenerateOptions = {
  mockupColor?: string;
};

export type UploadedScreenshot = {
  file: File;
  previewUrl: string;
  index: number;
  width?: number;
  height?: number;
};

export const STORE_SLIDE_COUNT = 5;
export const SOCIAL_ASSET_COUNT = 3;
export const MAX_SCREENSHOTS = 5;

export type SocialPlatform = "instagram_feed" | "instagram_story" | "twitter";

export type SocialAssetRole = "launch" | "feature" | "engagement";

export type ImageSize = "1024x1024" | "1024x1536" | "1280x2784" | "1536x1024";

export type SocialAssetPlan = {
  assetNumber: number;
  platform: SocialPlatform;
  role: SocialAssetRole;
  headline: string;
  subheadline: string;
  hook: string;
  caption: string;
  hashtags: string[];
  screenshotIndex: number | null;
  screenshotUsage: ScreenshotUsage;
  visualStyle: string;
  imageSize: ImageSize;
  copyVariants: CopyVariant[];
  selectedVariantId: CopyVariantId;
};

export type SocialStrategyBrief = {
  positioning: string;
  primaryMessage: string;
  targetAudience: string;
  visualTheme: string;
  accentColor?: string;
  brandColor?: string;
  colorProfile?: ScreenshotColorProfile | null;
  assets: SocialAssetPlan[];
};

export type GeneratedSocialAsset = {
  assetNumber: number;
  platform: SocialPlatform;
  role: SocialAssetRole;
  headline: string;
  hook: string;
  caption: string;
  hashtags: string[];
  dataUrl: string;
  prompt: string;
  selectedVariantId: CopyVariantId;
  usedScreenshot: boolean;
};

export const socialPlatformMeta: Record<
  SocialPlatform,
  { label: string; imageSize: ImageSize; formatLabel: string }
> = {
  instagram_feed: { label: "Instagram Feed", imageSize: "1024x1024", formatLabel: "1080×1080" },
  instagram_story: { label: "Instagram Story", imageSize: "1024x1536", formatLabel: "1080×1920" },
  twitter: { label: "X / Twitter", imageSize: "1536x1024", formatLabel: "1600×900" },
};

export type AutopilotPostRole =
  | "launch"
  | "feature"
  | "storytelling"
  | "engagement"
  | "cta"
  | "tip"
  | "behind_the_scenes";

export type PostFormat = "single" | "carousel" | "story" | "reels";

export type VisualTemplateId =
  | "hero_mockup"
  | "quote_card"
  | "stat_card"
  | "comparison_split"
  | "annotated_screenshot"
  | "feature_spotlight";

export type VideoTemplateId =
  | "logo_reveal"
  | "mood_teaser"
  | "screenshot_reel"
  | "kinetic_headline"
  | "countdown_teaser";

export type CampaignPhase = {
  id: string;
  name: string;
  goal: string;
  dayStart: number;
  dayEnd: number;
  narrativeFocus: string;
};

export type CarouselSlidePlan = {
  slideIndex: number;
  headline: string;
  subheadline?: string;
  visualTemplate: VisualTemplateId;
  screenshotIndex?: number | null;
};

export type CalendarPostPlan = {
  day: number;
  platform: SocialPlatform;
  role: AutopilotPostRole;
  format: PostFormat;
  phaseId?: string;
  visualTemplate?: VisualTemplateId;
  videoTemplate?: VideoTemplateId;
  carouselSlides?: CarouselSlidePlan[];
  headline: string;
  subheadline: string;
  hook: string;
  caption: string;
  hashtags: string[];
  screenshotIndex: number | null;
  screenshotUsage: ScreenshotUsage;
  screenshotRationale: string;
  visualStyle: string;
  imageSize: ImageSize;
  scheduledTime: string;
  scheduledAt?: string;
  copyVariants: CopyVariant[];
  selectedVariantId: CopyVariantId;
};

export type AutopilotStrategyBrief = {
  positioning: string;
  primaryMessage: string;
  targetAudience: string;
  visualTheme: string;
  accentColor?: string;
  brandColor?: string;
  colorProfile?: ScreenshotColorProfile | null;
  brandVoice: string;
  duration: CalendarDuration;
  startDate: string;
  contentPillars: string[];
  phases: CampaignPhase[];
  posts: CalendarPostPlan[];
};

export type GeneratedCalendarPost = {
  day: number;
  scheduledDate: string;
  scheduledTime: string;
  platform: SocialPlatform;
  role: AutopilotPostRole;
  format?: PostFormat;
  headline: string;
  hook: string;
  caption: string;
  hashtags: string[];
  screenshotRationale: string;
  dataUrl: string;
  prompt: string;
  selectedVariantId: CopyVariantId;
  usedScreenshot: boolean;
  postId?: string;
  campaignId?: string;
  carouselDataUrls?: string[];
  videoDataUrl?: string;
};

export const calendarDurationOptions: Array<{ value: CalendarDuration; label: string }> = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];
