import { NextResponse } from "next/server";
import { getStripePriceId, type BillingPlan } from "@/lib/billing/plans";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.redirect(new URL("/pricing?error=stripe_not_configured", request.url));
  }

  const formData = await request.formData();
  const plan = String(formData.get("plan") || "pro") as BillingPlan;
  const priceId = getStripePriceId(plan);

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=price_missing", request.url));
  }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/pricing?billing=cancelled`,
  });

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const session = (await stripeRes.json()) as { url?: string; error?: { message?: string } };
  if (!stripeRes.ok || !session.url) {
    return NextResponse.redirect(
      new URL(`/pricing?error=${encodeURIComponent(session.error?.message || "checkout_failed")}`, request.url),
    );
  }

  return NextResponse.redirect(session.url);
}
