import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { getDb, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
import { socialAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (!isDatabaseConfigured()) {
    return (
      <SiteChrome>
      <main className="settings-shell">
        <h1>Workspace settings</h1>
        <p className="settings-sub">
          Set <code>DATABASE_URL</code> in <code>.env.local</code> to enable workspaces, OAuth, and publishing.
        </p>
        <Link href="/" className="settings-btn">
          Back to pipeline
        </Link>
      </main>
      </SiteChrome>
    );
  }

  const user = await requireSession();
  const workspace = await requireWorkspace(user.id);

  const db = getDb();
  const accounts = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.workspaceId, workspace.id));

  return (
    <SiteChrome>
    <main className="settings-shell">
      <h1>Workspace settings</h1>
      <p className="settings-sub">Connect accounts to publish directly after you approve each post.</p>

      {params.error ? <p className="settings-error">{decodeURIComponent(params.error)}</p> : null}
      {params.connected ? (
        <p className="settings-success">Connected {params.connected} successfully.</p>
      ) : null}

      <section className="settings-card">
        <h2>Social accounts</h2>
        <ul className="account-list">
          {accounts.map((account) => (
            <li key={account.id}>
              <strong>{account.platform}</strong>
              {account.handle ? ` — @${account.handle}` : ""}
            </li>
          ))}
          {!accounts.length ? <li>No accounts connected yet.</li> : null}
        </ul>

        <div className="settings-connect">
          <Link href="/api/oauth/meta/authorize" className="settings-btn">
            Connect Instagram
          </Link>
          <Link href="/api/oauth/x/authorize" className="settings-btn">
            Connect X / Twitter
          </Link>
        </div>
      </section>

      <section className="settings-card">
        <h2>Publishing mode</h2>
        <p>
          <strong>Share now:</strong> Click Share on any generated post — you log in once, we publish immediately.
        </p>
        <p>
          <strong>Scheduled:</strong> Set scheduled time in calendar — posts publish automatically via background
          jobs (requires deployment with cron + Inngest).
        </p>
      </section>
    </main>
    </SiteChrome>
  );
}
