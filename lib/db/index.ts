import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon Postgres connection string to .env.local",
    );
  }
  if (!cachedDb) {
    const sql = neon(process.env.DATABASE_URL!);
    cachedDb = drizzle(sql, { schema });
  }
  return cachedDb;
}

export { schema };
