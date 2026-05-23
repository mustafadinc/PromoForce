import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { PLAN_FEATURES, type BillingPlan } from "@/lib/billing/plans";

const planOrder: BillingPlan[] = ["free", "pro", "agency"];

export default function PricingPage() {
  return (
    <SiteChrome>
    <main className="pricing-shell">
      <h1>Pricing</h1>
      <p className="pricing-lead">Start free, upgrade when you need auto-publish and longer campaigns.</p>

      <div className="pricing-grid">
        {planOrder.map((plan) => {
          const features = PLAN_FEATURES[plan];
          return (
            <article key={plan} className={`pricing-card ${plan === "pro" ? "is-featured" : ""}`}>
              <h2>{features.label}</h2>
              <p className="pricing-price">
                {features.priceMonthly === 0 ? "Free" : `$${features.priceMonthly}/mo`}
              </p>
              <ul>
                <li>{features.apps === 999 ? "Unlimited" : features.apps} app(s)</li>
                <li>{features.campaignDays}-day campaigns</li>
                <li>{features.autoPublish ? "Auto-publish + scheduling" : "Manual share only"}</li>
              </ul>
              {plan === "free" ? (
                <Link href="/" className="settings-btn">
                  Get started
                </Link>
              ) : (
                <form action="/api/stripe/checkout" method="POST">
                  <input type="hidden" name="plan" value={plan} />
                  <button type="submit" className="settings-btn">
                    Upgrade to {features.label}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>

      <p className="pricing-note">
        Stripe checkout requires <code>STRIPE_SECRET_KEY</code> and price IDs in <code>.env.local</code>. Meta App
        Review is required for production Instagram publishing beyond 25 test users.
      </p>
    </main>
    </SiteChrome>
  );}
