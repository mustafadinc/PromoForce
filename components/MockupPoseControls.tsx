"use client";

import type { MockupPose } from "@/lib/campaignTypes";
import {
  MOCKUP_ORIENTATION_OPTIONS,
  MOCKUP_PLACEMENT_OPTIONS,
  MOCKUP_SCALE_OPTIONS,
} from "@/lib/mockupPose";

type MockupPoseControlsProps = {
  pose: MockupPose;
  disabled?: boolean;
  compact?: boolean;
  onChange: (pose: MockupPose) => void;
};

function PoseSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <label className="mockup-pose-field">
      <span className="mockup-pose-label">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MockupPoseControls({ pose, disabled, compact, onChange }: MockupPoseControlsProps) {
  return (
    <div className={`mockup-pose-controls ${compact ? "is-compact" : ""}`}>
      <PoseSelect
        label="Angle"
        value={pose.orientation}
        options={MOCKUP_ORIENTATION_OPTIONS}
        disabled={disabled}
        onChange={(orientation) => onChange({ ...pose, orientation })}
      />
      <PoseSelect
        label="Size"
        value={pose.scale}
        options={MOCKUP_SCALE_OPTIONS}
        disabled={disabled}
        onChange={(scale) => onChange({ ...pose, scale })}
      />
      <PoseSelect
        label="Position"
        value={pose.placement}
        options={MOCKUP_PLACEMENT_OPTIONS}
        disabled={disabled}
        onChange={(placement) => onChange({ ...pose, placement })}
      />
    </div>
  );
}
