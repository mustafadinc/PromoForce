export type BillingPlan = "free" | "pro" | "agency";

export const PLAN_FEATURES: Record<
  BillingPlan,
  { label: string; apps: number; campaignDays: number; autoPublish: boolean; priceMonthly: number }
> = {
  free: { label: "Free", apps: 1, campaignDays: 7, autoPublish: false, priceMonthly: 0 },
  pro: { label: "Pro", apps: 3, campaignDays: 30, autoPublish: true, priceMonthly: 49 },
  agency: { label: "Agency", apps: 999, campaignDays: 30, autoPublish: true, priceMonthly: 199 },
};

export function getStripePriceId(plan: BillingPlan) {
  const map: Record<BillingPlan, string | undefined> = {
    free: undefined,
    pro: process.env.STRIPE_PRICE_PRO,
    agency: process.env.STRIPE_PRICE_AGENCY,
  };
  return map[plan];
}
