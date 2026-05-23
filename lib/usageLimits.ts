import { PLAN_LIMITS, type UsagePlan } from "@/lib/campaignTypes";

const USAGE_KEY = "promoforce-usage";
const PLAN_KEY = "promoforce-plan";

export const DEFAULT_USAGE_STATUS = {
  plan: "free" as UsagePlan,
  planLabel: PLAN_LIMITS.free.label,
  used: 0,
  limit: PLAN_LIMITS.free.dailyGenerations,
  remaining: PLAN_LIMITS.free.dailyGenerations,
};

type UsageState = {
  date: string;
  count: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(): UsageState {
  if (typeof window === "undefined") {
    return { date: todayKey(), count: 0 };
  }

  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as UsageState) : { date: todayKey(), count: 0 };
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function writeUsage(state: UsageState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USAGE_KEY, JSON.stringify(state));
}

export function getUsagePlan(): UsagePlan {
  if (typeof window === "undefined") return "free";

  const plan = localStorage.getItem(PLAN_KEY);
  return plan === "pro" ? "pro" : "free";
}

export function setUsagePlan(plan: UsagePlan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_KEY, plan);
}

export function getUsageStatus() {
  const plan = getUsagePlan();
  const limit = PLAN_LIMITS[plan].dailyGenerations;
  const usage = readUsage();

  return {
    plan,
    planLabel: PLAN_LIMITS[plan].label,
    used: usage.count,
    limit,
    remaining: Math.max(limit - usage.count, 0),
  };
}

export function canGenerate(count = 1) {
  const status = getUsageStatus();
  return {
    ok: status.remaining >= count,
    ...status,
  };
}

export function recordGenerations(count: number) {
  const usage = readUsage();
  usage.count += count;
  writeUsage(usage);
  return getUsageStatus();
}
