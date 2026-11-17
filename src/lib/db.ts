import Database from "better-sqlite3";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
let sqlite: Database.Database | undefined;
let pool: Pool | undefined;
export function database() {
  if (process.env.DATABASE_URL)
    return (pool ??= new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    }));
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error(
      "A PostgreSQL DATABASE_URL is required in production. Local data is never used as a fallback.",
    );
  if (!sqlite) {
    const path = process.env.HUB_SQLITE_PATH || ".private/hub.db";
    mkdirSync(dirname(path), { recursive: true });
    sqlite = new Database(path);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
  }
  return sqlite;
}
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = database();
  if (db instanceof Pool) return (await db.query(sql, params)).rows as T[];
  const args: unknown[] = [];
  const mapped = sql.replace(/\$(\d+)/g, (_, n) => {
    args.push(params[Number(n) - 1]);
    return "?";
  });
  const stmt = db.prepare(mapped);
  return (stmt.reader ? stmt.all(...args) : (stmt.run(...args), [])) as T[];
}
export async function migrateApp() {
  await query(
    "CREATE TABLE IF NOT EXISTS hub_jobs (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)",
  );
  await query(
    "CREATE INDEX IF NOT EXISTS hub_jobs_owner ON hub_jobs(owner_id)",
  );
  await query(
    "CREATE TABLE IF NOT EXISTS hub_attachments (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES hub_jobs(id) ON DELETE CASCADE, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)",
  );
  await query(
    "CREATE INDEX IF NOT EXISTS hub_attachments_job ON hub_attachments(owner_id, job_id)",
  );
}
export async function closeDatabase() {
  await pool?.end();
  sqlite?.close();
  pool = undefined;
  sqlite = undefined;
}
