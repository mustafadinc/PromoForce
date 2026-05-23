import Link from "next/link";
import { auth, isAuthConfigured, signOut } from "@/lib/auth";

export async function AppHeader() {
  const session = isAuthConfigured() ? await auth() : null;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-logo">
          PromoForce
        </Link>
        <nav className="app-nav">
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <div className="app-header-actions">
          {session?.user ? (
            <>
              <span className="app-user">{session.user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button type="submit" className="header-btn">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="header-btn">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
