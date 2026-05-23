"use client";

import type { ChangeEvent, FormEvent } from "react";
import { styleOptions, type PromoFormValues } from "@/lib/types";

type PromoFormProps = {
  errorMessage: string;
  isGenerating: boolean;
  onChange: <Field extends keyof PromoFormValues>(field: Field, value: PromoFormValues[Field]) => void;
  onScreenshotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  uploadPreviewUrl: string;
  values: PromoFormValues;
};

export function PromoForm({
  errorMessage,
  isGenerating,
  onChange,
  onScreenshotChange,
  onSubmit,
  uploadPreviewUrl,
  values,
}: PromoFormProps) {
  return (
    <aside className="panel input-panel">
      <div className="brand-row">
        <div className="brand-mark">LF</div>
        <div>
          <p className="eyebrow">Marketing Automation</p>
          <h1>LaunchFrame Pipeline</h1>
        </div>
      </div>

      <form className="form-stack" method="post" action="/" onSubmit={onSubmit}>
        <label className="field">
          <span>App Name</span>
          <input
            name="appName"
            onChange={(event) => onChange("appName", event.target.value)}
            placeholder="PulseTrack"
            required
            type="text"
            value={values.appName}
          />
        </label>

        <label className="field">
          <span>Category</span>
          <input
            name="category"
            onChange={(event) => onChange("category", event.target.value)}
            placeholder="Productivity"
            required
            type="text"
            value={values.category}
          />
        </label>

        <label className="field">
          <span>Short Description</span>
          <textarea
            name="description"
            onChange={(event) => onChange("description", event.target.value)}
            placeholder="A calm daily planner that turns busy days into focused action."
            required
            rows={3}
            value={values.description}
          />
        </label>

        <label className="field">
          <span>Target Audience</span>
          <input
            name="targetAudience"
            onChange={(event) => onChange("targetAudience", event.target.value)}
            placeholder="Busy founders and solo builders"
            type="text"
            value={values.targetAudience}
          />
        </label>

        <label className="field">
          <span>Style</span>
          <select
            name="style"
            onChange={(event) => onChange("style", event.target.value as PromoFormValues["style"])}
            value={values.style}
          >
            {styleOptions.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
        </label>

        <label className={`upload-zone ${uploadPreviewUrl ? "has-image" : ""}`} htmlFor="screenshot">
          <input id="screenshot" name="screenshot" onChange={onScreenshotChange} type="file" accept="image/*" required />
          <span className="upload-icon" aria-hidden="true">
            +
          </span>
          <strong>Upload app screenshot</strong>
          <small>PNG, JPG or WebP. Mobile screenshots work best.</small>
          {uploadPreviewUrl ? <img src={uploadPreviewUrl} alt="" /> : null}
        </label>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <button className="primary-action" type="submit" disabled={isGenerating}>
          {isGenerating ? "Preparing Campaign..." : "Start Marketing Pipeline"}
        </button>
      </form>
    </aside>
  );
}
