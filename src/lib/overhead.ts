import { query } from "./db";
import { overheadSchema, type Overhead } from "./domain";

let tableReady: Promise<unknown> | undefined;
function prepareOverhead() {
  return tableReady ??= query(
    "CREATE TABLE IF NOT EXISTS hub_overhead (owner_id TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (owner_id, id))",
  ).catch(error => {
    tableReady = undefined;
    throw error;
  });
}

export async function listOverhead(ownerId: string) {
  await prepareOverhead();
  const rows = await query<{ data: string }>(
    "SELECT data FROM hub_overhead WHERE owner_id=$1",
    [ownerId],
  );
  return rows.map(row => overheadSchema.parse(JSON.parse(row.data)));
}

export async function saveOverhead(ownerId: string, expense: Overhead) {
  await prepareOverhead();
  await query(
    "INSERT INTO hub_overhead (owner_id,id,data) VALUES ($1,$2,$3) ON CONFLICT (owner_id,id) DO UPDATE SET data=excluded.data",
    [ownerId, expense.id, JSON.stringify(expense)],
  );
}
