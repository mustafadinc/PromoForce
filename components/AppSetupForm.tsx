"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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
  submitLabel,
  workspaceProfile,
}: AppSetupFormProps) {
  const [campaignType, setCampaignType] = useState<CampaignType>("app_store");
  const [profile, setProfile] = useState<AppProfile>(initialProfile);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>(initialScreenshots);
  const [uploadError, setUploadError] = useState("");
  const [duration, setDuration] = useState<AutopilotConfig["duration"]>(7);
  const [startDate, setStartDate] = useState(defaultStartDate);

  useEffect(() => {
    if (workspaceProfile) {
      setProfile(workspaceProfile);
    }
  }, [workspaceProfile]);

  useEffect(() => {
    setScreenshots(initialScreenshots);
  }, [initialScreenshots]);

  const selectedCampaign = campaignTypeOptions.find((option) => option.value === campaignType);
  const isAutopilot = campaignType === "marketing_autopilot";

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
    <aside className="panel input-panel">
      <div className="brand-row">
        <div className="brand-mark">PF</div>
        <div>
          <p className="eyebrow">PromoForce</p>
          <h1>{selectedCampaign?.label || "Campaign"}</h1>
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
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

        <label
          className={`upload-zone ${screenshots.length ? "has-image" : ""}`}
          htmlFor="screenshots"
        >
          <input
            id="screenshots"
            name="screenshots"
            onChange={handleScreenshotChange}
            type="file"
            accept="image/*"
            multiple
            disabled={screenshots.length >= MAX_SCREENSHOTS}
          />
          <span className="upload-icon" aria-hidden="true">
            +
          </span>
          <strong>{screenshots.length ? "Add another screenshot" : "Upload app screenshots"}</strong>
          <small>
            {screenshots.length
              ? `${screenshots.length}/${MAX_SCREENSHOTS} added. PNG, JPG or WebP.`
              : `1–${MAX_SCREENSHOTS} screens. PNG, JPG or WebP.`}
          </small>
        </label>

        {screenshots.length ? (
          <div className="screenshot-grid">
            {screenshots.map((screenshot) => (
              <figure key={screenshot.index} className="screenshot-thumb">
                <button
                  className="screenshot-remove"
                  type="button"
                  aria-label={`Remove screen ${screenshot.index + 1}`}
                  onClick={() => removeScreenshot(screenshot.index)}
                >
                  ×
                </button>
                <img src={screenshot.previewUrl} alt={`App screen ${screenshot.index + 1}`} />
                <figcaption>Screen {screenshot.index + 1}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {uploadError ? <p className="error-message">{uploadError}</p> : null}

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <button className="primary-action" type="submit" disabled={isBusy}>
          {submitLabel}
        </button>
      </form>
    </aside>
  );
}
