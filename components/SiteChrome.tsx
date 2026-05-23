import Link from "next/link";
import { Sparkles } from "lucide-react";

type SiteChromeProps = {
  children: React.ReactNode;
};

export function SiteChrome({ children }: SiteChromeProps) {
  return (
    <div className="pf-site">
      <header className="pf-site-header">
        <Link href="/" className="pf-logo">
          <Sparkles className="pf-logo-icon" aria-hidden="true" />
          <span>PromoForce</span>
        </Link>
        <nav className="pf-site-nav">
          <Link href="/">Studio</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
