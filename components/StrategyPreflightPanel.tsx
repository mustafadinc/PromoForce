"use client";

import type { SetCoherenceAudit } from "@/lib/agents/setCoherenceAgent";
import type { NarrativeLintResult } from "@/lib/narrativeLint";

type StrategyPreflightPanelProps = {
  narrativeLint: NarrativeLintResult;
  coherenceAudit: SetCoherenceAudit | null;
  retakeCount: number;
  aspectIssueCount: number;
  localeMismatchCount?: number;
  isAuditing?: boolean;
};

export function StrategyPreflightPanel({
  narrativeLint,
  coherenceAudit,
  retakeCount,
  aspectIssueCount,
  localeMismatchCount = 0,
  isAuditing,
}: StrategyPreflightPanelProps) {
  const coherenceLow = coherenceAudit != null && coherenceAudit.overallScore < 80;
  const hasBlockers =
    narrativeLint.criticalCount > 0 ||
    coherenceLow ||
    retakeCount > 0 ||
    aspectIssueCount > 0 ||
    localeMismatchCount > 0;

  return (
    <div className={`pf-preflight-panel ${hasBlockers ? "has-warnings" : "is-ready"}`}>
      <div className="pf-preflight-header">
        <strong>Generate preflight</strong>
        {isAuditing ? <span className="pf-preflight-status">Running coherence audit…</span> : null}
        {!hasBlockers && !isAuditing ? (
          <span className="pf-preflight-status pf-preflight-status-ok">Ready to generate</span>
        ) : null}
      </div>

      <ul className="pf-preflight-checklist">
        <li className={narrativeLint.ok ? "is-pass" : "is-fail"}>
          Narrative lint — {narrativeLint.ok ? "pass" : `${narrativeLint.criticalCount} critical, ${narrativeLint.warningCount} warnings`}
        </li>
        <li className={coherenceAudit && coherenceAudit.overallScore >= 80 ? "is-pass" : coherenceAudit ? "is-warn" : "is-pending"}>
          Coherence audit —{" "}
          {coherenceAudit
            ? `${coherenceAudit.overallScore}/100 (narrative ${coherenceAudit.narrativeCohesion})`
            : isAuditing
              ? "running…"
              : "pending"}
        </li>
        <li className={retakeCount === 0 ? "is-pass" : "is-warn"}>
          Screenshot quality — {retakeCount === 0 ? "no retake ratings" : `${retakeCount} retake`}
        </li>
        <li className={aspectIssueCount === 0 ? "is-pass" : "is-warn"}>
          Aspect ratio — {aspectIssueCount === 0 ? "ok" : `${aspectIssueCount} warning(s)`}
        </li>
        {localeMismatchCount > 0 ? (
          <li className="is-fail">Locale UI — {localeMismatchCount} language mismatch(es)</li>
        ) : (
          <li className="is-pass">Locale UI — matches selected language(s)</li>
        )}
      </ul>

      {narrativeLint.issues.length ? (
        <ul className="pf-preflight-issues">
          {narrativeLint.issues.slice(0, 6).map((issue, index) => (
            <li key={`${issue.code}-${index}`} className={issue.severity === "error" ? "is-error" : "is-warning"}>
              {issue.slideNumber ? `Slide ${issue.slideNumber}: ` : ""}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {coherenceAudit?.issues.length ? (
        <ul className="pf-preflight-issues">
          {coherenceAudit.issues.slice(0, 4).map((issue, index) => (
            <li key={`audit-${index}`} className={issue.severity === "error" ? "is-error" : "is-warning"}>
              {issue.slideNumber ? `Slide ${issue.slideNumber}: ` : ""}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
