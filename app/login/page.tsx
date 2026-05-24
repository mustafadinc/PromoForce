import { auth, isAuthConfigured, signIn } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (!isAuthConfigured()) {
    redirect("/");
  }

  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="pf-login-shell">
      <Link href="/" className="pf-login-logo">
        <Sparkles className="pf-logo-icon" aria-hidden="true" />
        <span>PromoForce</span>
      </Link>

      <section className="login-card pf-login-card">
        <h1>Welcome back</h1>
        <p>AI marketing engine for app launches — App Store, Instagram, X, and 30-day autopilot calendars.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="login-btn pf-login-btn">
            Continue with Google
          </button>
        </form>
        <p className="login-note">Sign in to save campaigns, connect social accounts, and schedule posts.</p>
      </section>
    </main>
  );
}
