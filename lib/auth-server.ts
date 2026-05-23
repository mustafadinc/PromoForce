import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; email?: string | null; name?: string | null };
}

export async function getDefaultWorkspace(userId: string) {
  const db = getDb();
  const rows = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function requireWorkspace(userId: string, workspaceId?: string) {
  const db = getDb();
  if (workspaceId) {
    const rows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const workspace = rows[0];
    if (!workspace || workspace.ownerId !== userId) {
      throw new Error("Workspace not found");
    }
    return workspace;
  }
  const workspace = await getDefaultWorkspace(userId);
  if (!workspace) {
    throw new Error("No workspace found");
  }
  return workspace;
}
