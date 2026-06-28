"use client";



import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Plus, Trash2, UploadCloud } from "lucide-react";

import type { SetupDraft } from "@/components/SetupPreviewPanel";

import {

  calendarDurationOptions,

  campaignTypeOptions,

  MAX_SCREENSHOTS,

  type AppProfile,

  type AutopilotConfig,

  type CampaignType,

  type LocaleCode,

  type LocaleScreenshotsMap,

  type UploadedScreenshot,

} from "@/lib/campaignTypes";

import { getLocaleDefinition, SUPPORTED_LOCALES } from "@/lib/locales";

import { validateLocaleScreenshots } from "@/lib/localeScreenshots";

import { formatLocaleMismatchMessage } from "@/lib/detectScreenshotLanguage";

import { buildUploadedScreenshot } from "@/lib/screenshotUpload";

import { lintScreenshotAspects } from "@/lib/screenshotAspectLint";



type AppSetupFormProps = {

  errorMessage: string;

  isBusy: boolean;

  initialScreenshots?: UploadedScreenshot[];

  initialScreenshotsByLocale?: LocaleScreenshotsMap;

  onSubmit: (

    campaignType: CampaignType,

    profile: AppProfile,

    input: UploadedScreenshot[] | LocaleScreenshotsMap,

    autopilotConfig?: AutopilotConfig,

    localeMismatchWarnings?: Partial<Record<LocaleCode, string>>,

  ) => void;

  onDraftChange?: (draft: SetupDraft) => void;

  submitLabel: string;

  workspaceProfile?: AppProfile | null;

};



const initialProfile: AppProfile = {

  appName: "",

  category: "",

  description: "",

  targetAudience: "",

  locales: ["en"],

};



const defaultStartDate = () => new Date().toISOString().slice(0, 10);



function LocaleScreenshotUploadBlock({

  locale,

  screenshots,

  uploadError,

  onUpload,

  onRemove,

  localeWarning,

}: {

  locale: LocaleCode;

  screenshots: UploadedScreenshot[];

  uploadError: string;

  onUpload: (locale: LocaleCode, event: ChangeEvent<HTMLInputElement>) => void;

  onRemove: (locale: LocaleCode, index: number) => void;

  localeWarning?: string;

}) {

  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = getLocaleDefinition(locale).label;

  const aspectIssues = useMemo(() => lintScreenshotAspects(screenshots), [screenshots]);



  return (

    <div className="pf-upload-block pf-upload-block-locale">

      <span className="field-label">App Screenshots — {label}</span>

      <p className="pf-upload-locale-hint">

        Upload screenshots with UI text in {label}. Each language needs its own localized screens.

      </p>

      <button

        type="button"

        className="pf-upload-zone"

        onClick={() => fileInputRef.current?.click()}

        disabled={screenshots.length >= MAX_SCREENSHOTS}

      >

        <UploadCloud aria-hidden="true" />

        <strong>

          {screenshots.length ? `Add another ${label} screenshot` : `Upload ${label} screenshots`}

        </strong>

        <small>

          {screenshots.length

            ? `${screenshots.length}/${MAX_SCREENSHOTS} added. PNG, JPG or WebP.`

            : `1–${MAX_SCREENSHOTS} screens. PNG, JPG or WebP.`}

        </small>

      </button>



      <input

        ref={fileInputRef}

        id={`screenshots_${locale}`}

        name={`screenshots_${locale}`}

        onChange={(event) => onUpload(locale, event)}

        type="file"

        accept="image/*"

        multiple

        hidden

      />



      <div className="pf-screenshot-grid">

        {screenshots.map((screenshot) => (

          <figure key={`${locale}-${screenshot.index}`} className="pf-screenshot-thumb">

            <button

              className="screenshot-remove"

              type="button"

              aria-label={`Remove ${label} screen ${screenshot.index + 1}`}

              onClick={() => onRemove(locale, screenshot.index)}

            >

              <Trash2 aria-hidden="true" />

            </button>

            <img src={screenshot.previewUrl} alt={`${label} app screen ${screenshot.index + 1}`} />

            <figcaption>Screen {screenshot.index + 1}</figcaption>

          </figure>

        ))}

        {screenshots.length < MAX_SCREENSHOTS ? (

          <button

            type="button"

            className="pf-screenshot-add"

            onClick={() => fileInputRef.current?.click()}

          >

            <Plus aria-hidden="true" />

            <span>Add</span>

          </button>

        ) : null}

      </div>

      {aspectIssues.length ? (

        <div className="strategy-warning aspect-warning-panel pf-setup-aspect-warn">

          <strong>Screenshot aspect ({label})</strong>

          <ul>

            {aspectIssues.map((issue) => (

              <li key={issue.index}>{issue.message}</li>

            ))}

          </ul>

        </div>

      ) : null}

      {uploadError ? <p className="error-message">{uploadError}</p> : null}

      {localeWarning ? <p className="strategy-warning">{localeWarning}</p> : null}

    </div>

  );

}



export function AppSetupForm({

  errorMessage,

  isBusy,

  initialScreenshots = [],

  initialScreenshotsByLocale,

  onSubmit,

  onDraftChange,

  submitLabel,

  workspaceProfile,

}: AppSetupFormProps) {

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [campaignType, setCampaignType] = useState<CampaignType>("app_store");

  const [profile, setProfile] = useState<AppProfile>(initialProfile);

  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>(initialScreenshots);

  const [screenshotsByLocale, setScreenshotsByLocale] = useState<LocaleScreenshotsMap>(

    initialScreenshotsByLocale?.en?.length

      ? initialScreenshotsByLocale

      : { en: initialScreenshots },

  );

  const [uploadError, setUploadError] = useState("");

  const [localeMismatchWarnings, setLocaleMismatchWarnings] = useState<
    Partial<Record<LocaleCode, string>>
  >({});

  const [duration, setDuration] = useState<AutopilotConfig["duration"]>(7);

  const [startDate, setStartDate] = useState(defaultStartDate);

  const [selectedLocales, setSelectedLocales] = useState<LocaleCode[]>(["en"]);

  const [appTitle, setAppTitle] = useState("");

  const [appSubtitle, setAppSubtitle] = useState("");

  const [keywords, setKeywords] = useState("");

  const [reviewQuotes, setReviewQuotes] = useState("");

  const [downloadCount, setDownloadCount] = useState("");

  const [rating, setRating] = useState("");

  const [slideCount, setSlideCount] = useState<number>(5);
  const [fontFamily, setFontFamily] = useState<string>("Inter");

  const isAutopilot = campaignType === "marketing_autopilot";

  const isAppStore = campaignType === "app_store";

  const checkLocaleScreenshotLanguage = async (locale: LocaleCode, file: File) => {
    try {
      const formData = new FormData();
      formData.append("locale", locale);
      formData.append("screenshot", file);
      const response = await fetch("/api/screenshots/detect-language", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        matchesLocale?: boolean;
        detected?: string;
      };
      if (!response.ok || payload.matchesLocale !== false || !payload.detected) {
        setLocaleMismatchWarnings((prev) => {
          const next = { ...prev };
          delete next[locale];
          return next;
        });
        return;
      }
      setLocaleMismatchWarnings((prev) => ({
        ...prev,
        [locale]: formatLocaleMismatchMessage(locale, payload.detected!),
      }));
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    if (workspaceProfile) {
      setProfile(workspaceProfile);
      if (workspaceProfile.locales?.length) {
        setSelectedLocales(workspaceProfile.locales);
      }
      if (workspaceProfile.slideCount) {
        setSlideCount(workspaceProfile.slideCount);
      }
      if (workspaceProfile.fontFamily) {
        setFontFamily(workspaceProfile.fontFamily);
      }
    }
  }, [workspaceProfile]);



  useEffect(() => {

    if (initialScreenshotsByLocale && Object.keys(initialScreenshotsByLocale).length) {

      setScreenshotsByLocale(initialScreenshotsByLocale);

    } else if (initialScreenshots.length) {

      setScreenshots(initialScreenshots);

      if (!isAppStore) {

        setScreenshotsByLocale({ en: initialScreenshots });

      }

    }

  }, [initialScreenshots, initialScreenshotsByLocale, isAppStore]);



  useEffect(() => {
    onDraftChange?.({
      campaignType,
      profile: { ...profile, slideCount, fontFamily },
      screenshots: isAppStore ? [] : screenshots,
      screenshotsByLocale: isAppStore ? screenshotsByLocale : undefined,
      selectedLocales: isAppStore ? selectedLocales : undefined,
      autopilotConfig: isAutopilot ? { duration, startDate } : undefined,
    });
  }, [
    campaignType,
    profile,
    slideCount,
    fontFamily,
    screenshots,
    screenshotsByLocale,
    selectedLocales,
    duration,
    startDate,
    isAutopilot,
    isAppStore,
    onDraftChange,
  ]);



  const aspectIssues = useMemo(() => lintScreenshotAspects(screenshots), [screenshots]);



  const updateProfile = <Field extends keyof AppProfile>(field: Field, value: AppProfile[Field]) => {

    setProfile((current) => ({ ...current, [field]: value }));

  };



  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {

    const incoming = Array.from(event.target.files || []);

    event.target.value = "";



    if (!incoming.length) return;



    setUploadError("");



    void (async () => {

      let current: UploadedScreenshot[] = [];

      setScreenshots((existing) => {

        current = existing;

        return existing;

      });



      const remaining = MAX_SCREENSHOTS - current.length;

      if (remaining <= 0) {

        setUploadError(`You can upload up to ${MAX_SCREENSHOTS} screenshots.`);

        return;

      }



      const nextFiles = incoming.slice(0, remaining);

      if (incoming.length > remaining) {

        setUploadError(

          `Only ${remaining} more screenshot${remaining === 1 ? "" : "s"} added (${MAX_SCREENSHOTS} max).`,

        );

      }



      const startIndex = current.length;

      const added = await Promise.all(

        nextFiles.map((file, offset) => buildUploadedScreenshot(file, startIndex + offset)),

      );



      setScreenshots(

        [...current, ...added].map((item, index) => ({ ...item, index })).slice(0, MAX_SCREENSHOTS),

      );

    })();

  };



  const handleLocaleScreenshotChange = (locale: LocaleCode, event: ChangeEvent<HTMLInputElement>) => {

    const incoming = Array.from(event.target.files || []);

    event.target.value = "";



    if (!incoming.length) return;



    setUploadError("");



    void (async () => {

      let current: UploadedScreenshot[] = [];

      setScreenshotsByLocale((existing) => {

        current = existing[locale] ?? [];

        return existing;

      });



      const remaining = MAX_SCREENSHOTS - current.length;

      if (remaining <= 0) {

        setUploadError(`You can upload up to ${MAX_SCREENSHOTS} screenshots per language.`);

        return;

      }



      const nextFiles = incoming.slice(0, remaining);

      if (incoming.length > remaining) {

        setUploadError(

          `Only ${remaining} more screenshot${remaining === 1 ? "" : "s"} added (${MAX_SCREENSHOTS} max per language).`,

        );

      }



      const startIndex = current.length;

      const added = await Promise.all(

        nextFiles.map((file, offset) =>

          buildUploadedScreenshot(file, startIndex + offset).then((shot) => ({

            ...shot,

            locale,

          })),

        ),

      );



      const updated = [...current, ...added]

        .map((item, index) => ({ ...item, index, locale }))

        .slice(0, MAX_SCREENSHOTS);



      setScreenshotsByLocale((prev) => ({ ...prev, [locale]: updated }));

      if (updated[0]?.file) {
        void checkLocaleScreenshotLanguage(locale, updated[0].file);
      }

    })();

  };



  const removeScreenshot = (index: number) => {

    setScreenshots((current) =>

      current

        .filter((item) => item.index !== index)

        .map((item, nextIndex) => ({ ...item, index: nextIndex })),

    );

    setUploadError("");

  };



  const removeLocaleScreenshot = (locale: LocaleCode, index: number) => {

    setScreenshotsByLocale((current) => {

      const shots = current[locale] ?? [];

      return {

        ...current,

        [locale]: shots

          .filter((item) => item.index !== index)

          .map((item, nextIndex) => ({ ...item, index: nextIndex, locale })),

      };

    });

    setUploadError("");

  };



  const toggleLocale = (code: LocaleCode) => {

    setSelectedLocales((current) => {

      if (current.includes(code)) {

        if (current.length === 1) return current;

        setScreenshotsByLocale((prev) => {

          const next = { ...prev };

          delete next[code];

          return next;

        });

        return current.filter((item) => item !== code);

      }

      setScreenshotsByLocale((prev) => ({ ...prev, [code]: prev[code] ?? [] }));

      return [...current, code];

    });

  };



  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    const nextLocales = selectedLocales.length ? selectedLocales : (["en"] as LocaleCode[]);



    if (isAppStore) {

      const localeError = validateLocaleScreenshots(nextLocales, screenshotsByLocale);

      if (localeError) {

        setUploadError(localeError);

        return;

      }

    } else if (screenshots.length === 0) {

      setUploadError("Upload at least one app screenshot.");

      return;

    }



    setUploadError("");

    const nextProfile: AppProfile = {
      ...profile,
      slideCount,
      fontFamily,
      appTitle: appTitle.trim() || undefined,
      appSubtitle: appSubtitle.trim() || undefined,
      keywords: keywords.trim() || undefined,
      locales: nextLocales,
      socialProof: {
        reviewQuotes: reviewQuotes
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        downloadCount: downloadCount.trim() || undefined,
        rating: rating ? Number.parseFloat(rating) : undefined,
      },
    };



    onSubmit(

      campaignType,

      nextProfile,

      isAppStore ? screenshotsByLocale : screenshots,

      isAutopilot ? { duration, startDate } : undefined,

      isAppStore ? localeMismatchWarnings : undefined,

    );

  };



  return (

    <aside className="pf-setup-panel">

      <div className="pf-setup-panel-inner">

        <div className="pf-setup-intro">

          <h2>Campaign Type</h2>

          <p>Choose App Store packaging, social launch assets, or an autopilot calendar.</p>

        </div>



        <form className="form-stack pf-setup-form" method="post" action="/" onSubmit={handleSubmit}>

          <fieldset className="campaign-type-fieldset">

            <legend>Campaign type</legend>

            <div className="campaign-type-grid">

              {campaignTypeOptions.map((option) => (

                <label

                  key={option.value}

                  className={`campaign-type-option ${campaignType === option.value ? "is-selected" : ""}`}

                >

                  <input

                    type="radio"

                    name="campaignType"

                    value={option.value}

                    checked={campaignType === option.value}

                    onChange={() => setCampaignType(option.value)}

                  />

                  <strong>{option.label}</strong>

                  <small>{option.description}</small>

                </label>

              ))}

            </div>

          </fieldset>



          {isAutopilot ? (

            <div className="autopilot-setup-grid">

              <label className="field">

                <span>Calendar length</span>

                <select value={duration} onChange={(event) => setDuration(Number(event.target.value) as 7 | 30)}>

                  {calendarDurationOptions.map((option) => (

                    <option key={option.value} value={option.value}>

                      {option.label}

                    </option>

                  ))}

                </select>

              </label>

              <label className="field">

                <span>Start date</span>

                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />

              </label>

            </div>

          ) : null}



          {isAutopilot ? (

            <p className="strategy-note">

              AI will act as your marketing director — planning daily posts, deciding when to use screenshots, and keeping

              brand consistency across the calendar.

            </p>

          ) : null}



          <label className="field">

            <span>App Name</span>

            <input

              name="appName"

              onChange={(event) => updateProfile("appName", event.target.value)}

              placeholder="PulseTrack"

              required

              type="text"

              value={profile.appName}

            />

          </label>



          <label className="field">

            <span>Category</span>

            <input

              name="category"

              onChange={(event) => updateProfile("category", event.target.value)}

              placeholder="Productivity"

              required

              type="text"

              value={profile.category}

            />

          </label>



          <label className="field">

            <span>Short Description</span>

            <textarea

              name="description"

              onChange={(event) => updateProfile("description", event.target.value)}

              placeholder="A calm daily planner that turns busy days into focused action."

              required

              rows={3}

              value={profile.description}

            />

          </label>



          <label className="field">

            <span>Target Audience</span>

            <input

              name="targetAudience"

              onChange={(event) => updateProfile("targetAudience", event.target.value)}

              placeholder="Busy founders and solo builders"

              type="text"

              value={profile.targetAudience}

            />

          </label>



          {isAppStore ? (

            <>

              <fieldset className="campaign-type-fieldset">

                <legend>Languages (native ASO copy per locale)</legend>

                <div className="locale-picker-grid">

                  {SUPPORTED_LOCALES.map((locale) => (

                    <label key={locale.code} className="locale-picker-option">

                      <input

                        type="checkbox"

                        checked={selectedLocales.includes(locale.code)}

                        onChange={() => toggleLocale(locale.code)}

                      />

                      <span>{locale.label}</span>

                    </label>

                  ))}

                </div>

              </fieldset>

              <label className="field">
                <span>Number of screenshots to generate</span>
                <select
                  value={slideCount}
                  onChange={(event) => setSlideCount(Number(event.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 5 ? "(Recommended)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Font Family</span>
                <select
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                >
                  {[
                    "Inter",
                    "Roboto",
                    "Montserrat",
                    "Oswald",
                    "Playfair Display",
                    "Poppins",
                    "Outfit",
                    "Caveat"
                  ].map((font) => (
                    <option key={font} value={font}>
                      {font} {font === "Inter" ? "(Recommended)" : ""}
                    </option>
                  ))}
                </select>
              </label>



              <label className="field">

                <span>App Store Title (optional — ASO keywords)</span>

                <input

                  value={appTitle}

                  onChange={(event) => setAppTitle(event.target.value)}

                  placeholder="PulseTrack — Daily Focus Planner"

                  type="text"

                />

              </label>



              <label className="field">

                <span>App Store Subtitle (optional)</span>

                <input

                  value={appSubtitle}

                  onChange={(event) => setAppSubtitle(event.target.value)}

                  placeholder="Build habits in minutes"

                  type="text"

                />

              </label>



              <label className="field">

                <span>Keyword field (optional, comma-separated)</span>

                <input

                  value={keywords}

                  onChange={(event) => setKeywords(event.target.value)}

                  placeholder="focus timer, habit tracker, productivity"

                  type="text"

                />

              </label>



              <label className="field">

                <span>Review quote (optional, for social proof slide)</span>

                <textarea

                  value={reviewQuotes}

                  onChange={(event) => setReviewQuotes(event.target.value)}

                  placeholder={"Best focus app I've tried this year"}

                  rows={2}

                />

              </label>



              <div className="autopilot-setup-grid">

                <label className="field">

                  <span>Download count (optional)</span>

                  <input

                    value={downloadCount}

                    onChange={(event) => setDownloadCount(event.target.value)}

                    placeholder="Used by 10,000+ users"

                    type="text"

                  />

                </label>

                <label className="field">

                  <span>Rating (optional)</span>

                  <input

                    value={rating}

                    onChange={(event) => setRating(event.target.value)}

                    placeholder="4.8"

                    type="number"

                    min={0}

                    max={5}

                    step={0.1}

                  />

                </label>

              </div>



              <fieldset className="campaign-type-fieldset">

                <legend>Localized app screenshots</legend>

                <p className="strategy-note">

                  Upload separate screenshots for each language so mockups show the correct localized UI.

                </p>

                {selectedLocales.map((locale) => (

                  <LocaleScreenshotUploadBlock

                    key={locale}

                    locale={locale}

                    screenshots={screenshotsByLocale[locale] ?? []}

                    uploadError={uploadError}

                    onUpload={handleLocaleScreenshotChange}

                    onRemove={removeLocaleScreenshot}

                    localeWarning={localeMismatchWarnings[locale]}

                  />

                ))}

              </fieldset>

            </>

          ) : (

            <div className="pf-upload-block">

              <span className="field-label">App Screenshots</span>

              <button

                type="button"

                className="pf-upload-zone"

                onClick={() => fileInputRef.current?.click()}

                disabled={screenshots.length >= MAX_SCREENSHOTS}

              >

                <UploadCloud aria-hidden="true" />

                <strong>{screenshots.length ? "Add another screenshot" : "Drag or select screenshot files"}</strong>

                <small>

                  {screenshots.length

                    ? `${screenshots.length}/${MAX_SCREENSHOTS} added. PNG, JPG or WebP.`

                    : `1–${MAX_SCREENSHOTS} screens. PNG, JPG or WebP.`}

                </small>

              </button>



              <input

                ref={fileInputRef}

                id="screenshots"

                name="screenshots"

                onChange={handleScreenshotChange}

                type="file"

                accept="image/*"

                multiple

                hidden

              />



              <div className="pf-screenshot-grid">

                {screenshots.map((screenshot) => (

                  <figure key={screenshot.index} className="pf-screenshot-thumb">

                    <button

                      className="screenshot-remove"

                      type="button"

                      aria-label={`Remove screen ${screenshot.index + 1}`}

                      onClick={() => removeScreenshot(screenshot.index)}

                    >

                      <Trash2 aria-hidden="true" />

                    </button>

                    <img src={screenshot.previewUrl} alt={`App screen ${screenshot.index + 1}`} />

                    <figcaption>Screen {screenshot.index + 1}</figcaption>

                  </figure>

                ))}

                {screenshots.length < MAX_SCREENSHOTS ? (

                  <button type="button" className="pf-screenshot-add" onClick={() => fileInputRef.current?.click()}>

                    <Plus aria-hidden="true" />

                    <span>Add</span>

                  </button>

                ) : null}

              </div>

              {aspectIssues.length ? (

                <div className="strategy-warning aspect-warning-panel pf-setup-aspect-warn">

                  <strong>Screenshot aspect</strong>

                  <ul>

                    {aspectIssues.map((issue) => (

                      <li key={issue.index}>{issue.message}</li>

                    ))}

                  </ul>

                </div>

              ) : null}

            </div>

          )}



          {uploadError && !isAppStore ? <p className="error-message">{uploadError}</p> : null}

          {errorMessage ? <p className="error-message">{errorMessage}</p> : null}



          <button className="primary-action pf-setup-submit" type="submit" disabled={isBusy}>

            {submitLabel}

          </button>

        </form>

      </div>

    </aside>

  );

}


