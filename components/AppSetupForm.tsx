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
  type UploadedScreenshot,
} from "@/lib/campaignTypes";
import { buildUploadedScreenshot } from "@/lib/screenshotUpload";
import { lintScreenshotAspects } from "@/lib/screenshotAspectLint";

type AppSetupFormProps = {
  errorMessage: string;
  isBusy: boolean;
  initialScreenshots?: UploadedScreenshot[];
  onSubmit: (
    campaignType: CampaignType,
    profile: AppProfile,
    screenshots: UploadedScreenshot[],
    autopilotConfig?: AutopilotConfig,
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
};

const defaultStartDate = () => new Date().toISOString().slice(0, 10);

export function AppSetupForm({
  errorMessage,
  isBusy,
  initialScreenshots = [],
  onSubmit,
  onDraftChange,
  submitLabel,
  workspaceProfile,
}: AppSetupFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [campaignType, setCampaignType] = useState<CampaignType>("app_store");
  const [profile, setProfile] = useState<AppProfile>(initialProfile);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>(initialScreenshots);
  const [uploadError, setUploadError] = useState("");
  const [duration, setDuration] = useState<AutopilotConfig["duration"]>(7);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const isAutopilot = campaignType === "marketing_autopilot";

  useEffect(() => {
    if (workspaceProfile) {
      setProfile(workspaceProfile);
    }
  }, [workspaceProfile]);

  useEffect(() => {
    setScreenshots(initialScreenshots);
  }, [initialScreenshots]);

  useEffect(() => {
    onDraftChange?.({
      campaignType,
      profile,
      screenshots,
      autopilotConfig: isAutopilot ? { duration, startDate } : undefined,
    });
  }, [campaignType, profile, screenshots, duration, startDate, isAutopilot, onDraftChange]);

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

  const removeScreenshot = (index: number) => {
    setScreenshots((current) =>
      current
        .filter((item) => item.index !== index)
        .map((item, nextIndex) => ({ ...item, index: nextIndex })),
    );
    setUploadError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (screenshots.length === 0) {
      setUploadError("Upload at least one app screenshot.");
      return;
    }

    setUploadError("");
    onSubmit(
      campaignType,
      profile,
      screenshots,
      isAutopilot ? { duration, startDate } : undefined,
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

          {uploadError ? <p className="error-message">{uploadError}</p> : null}
          {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

          <button className="primary-action pf-setup-submit" type="submit" disabled={isBusy}>
            {submitLabel}
          </button>
        </form>
      </div>
    </aside>
  );
}
