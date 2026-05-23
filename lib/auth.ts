import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { accounts, sessions, users, verificationTokens, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const dbAdapter = isDatabaseConfigured()
  ? DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    })
  : undefined;

export function isAuthConfigured() {
  return Boolean(process.env.AUTH_SECRET?.trim());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: dbAdapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !isDatabaseConfigured()) return;
      const db = getDb();
      const existing = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, user.id))
        .limit(1);
      if (!existing.length) {
        await db.insert(workspaces).values({
          ownerId: user.id,
          name: user.name ? `${user.name}'s Workspace` : "My Workspace",
        });
      }
    },
  },
});

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};
