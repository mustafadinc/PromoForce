import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";

const steps = [
  { n: 1, title: "Sign in", body: "Create your workspace with Google." },
  { n: 2, title: "Add your app", body: "Name, category, description, and 1–10 screenshots." },
  { n: 3, title: "Connect social", body: "Link Instagram Business and X in Settings." },
  { n: 4, title: "Generate campaign", body: "AI plans a dynamic 7 or 30-day calendar — formats, phases, and copy." },
  { n: 5, title: "Review & share", body: "Approve creatives, then Share now or schedule." },
];

export default function OnboardingPage() {
  return (
    <SiteChrome>
    <main className="onboarding-shell">
      <h1>Get started with PromoForce</h1>
      <p className="onboarding-lead">
        Your AI marketing director for app launches — not 30 random templates, but a story-driven calendar that
        learns from performance.
      </p>

      <ol className="onboarding-steps">
        {steps.map((step) => (
          <li key={step.n}>
            <span className="onboarding-num">{step.n}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="onboarding-actions">
        <Link href="/" className="settings-btn">
          Open pipeline
        </Link>
        <Link href="/settings" className="settings-btn secondary">
          Connect accounts
        </Link>
      </div>
    </main>
    </SiteChrome>
  );}
