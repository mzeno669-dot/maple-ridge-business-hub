import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "maple-ridge-test-"));
process.env.HUB_SQLITE_PATH = join(dir, "test.db");
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const { migrateApp, closeDatabase, database } = await import("../src/lib/db");
const { insertJob, getJob, listJobs, updateJob } = await import(
  "../src/lib/jobs"
);
const { newJob } = await import("../src/lib/domain");
const { HttpError } = await import("../src/lib/errors");
await migrateApp();
after(async () => {
  await closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
test("records persist across reconnects and do not leak between owners", async () => {
  const saved = await insertJob(newJob("Private test customer"), "owner-a");
  await closeDatabase();
  assert.equal(
    (await getJob(saved.id, "owner-a")).customer,
    "Private test customer",
  );
  assert.equal((await listJobs("owner-b")).length, 0);
  await assert.rejects(
    getJob(saved.id, "owner-b"),
    (e) => e instanceof HttpError && e.status === 404,
  );
});
test("simultaneous edits cannot silently overwrite a saved revision", async () => {
  const original = await insertJob(newJob("Concurrency test"), "owner-a");
  const first = await updateJob(
    { ...original, notes: "First edit" },
    "owner-a",
  );
  assert.equal(first.revision, 2);
  await assert.rejects(
    updateJob({ ...original, notes: "Stale edit" }, "owner-a"),
    (e) => e instanceof HttpError && e.status === 409,
  );
  assert.equal((await getJob(original.id, "owner-a")).notes, "First edit");
});
test("inserts do not replace an existing job; cross-owner update is rejected", async () => {
  const original = await insertJob(newJob("Scope test"), "owner-a");
  await assert.rejects(
    insertJob(original, "owner-b"),
    (e) => e instanceof HttpError && e.status === 409,
  );
  await assert.rejects(
    updateJob(original, "owner-b"),
    (e) => e instanceof HttpError && e.status === 404,
  );
});
test("Vercel fails closed rather than using an ephemeral filesystem database", async () => {
  await closeDatabase();
  process.env.VERCEL = "1";
  assert.throws(() => database(), /PostgreSQL/);
  delete process.env.VERCEL;
});
