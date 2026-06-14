import type { BackgroundSubjectAnalysis } from "@/lib/backgroundSubjectAnalysis";
import { overlapArea } from "@/lib/backgroundSubjectAnalysis";
import type { MockupKeepOutRect } from "@/lib/mockupKeepOutZone";
import { estimateMockupKeepOutRect } from "@/lib/mockupKeepOutZone";
import type { MockupPlacement, MockupPose } from "@/lib/mockupPose";

const MAX_OVERLAP_RATIO = 0.15;

export function resolveSubjectAwarePose(
  pose: MockupPose,
  analysis: BackgroundSubjectAnalysis,
  canvasW: number,
  canvasH: number,
): MockupPose {
  if (pose.placement !== "auto") {
    return pose;
  }

  const subject = analysis.subjectBox;
  if (!subject) {
    const fallbackPlacement: MockupPlacement =
      analysis.openSide === "left" ? "right" : analysis.openSide === "right" ? "left" : "center";
    return { ...pose, placement: fallbackPlacement };
  }

  const candidates: MockupPlacement[] = ["left", "right", "center"];
  let bestPlacement: MockupPlacement = "right";
  let bestOverlap = Number.POSITIVE_INFINITY;

  for (const placement of candidates) {
    const trialPose: MockupPose = { ...pose, placement };
    const keepOut = estimateMockupKeepOutRect(canvasW, canvasH, trialPose);
    const overlap = overlapArea(subject, keepOut);
    const ratio = overlap / Math.max(1, subject.width * subject.height);
    if (ratio < bestOverlap) {
      bestOverlap = ratio;
      bestPlacement = placement;
    }
  }

  let resolved: MockupPose = { ...pose, placement: bestPlacement };

  if (bestOverlap > MAX_OVERLAP_RATIO && bestPlacement !== "center") {
    const compactPose: MockupPose = { ...resolved, scale: "compact" };
    const keepOut = estimateMockupKeepOutRect(canvasW, canvasH, compactPose);
    const overlap = subject ? overlapArea(subject, keepOut) / Math.max(1, subject.width * subject.height) : 0;
    if (overlap < bestOverlap) {
      resolved = compactPose;
    }
  }

  return resolved;
}

export function measurePoseOcclusion(
  subject: { x: number; y: number; width: number; height: number } | null,
  keepOut: MockupKeepOutRect,
): number {
  if (!subject) return 0;
  return overlapArea(subject, keepOut) / Math.max(1, subject.width * subject.height);
}
