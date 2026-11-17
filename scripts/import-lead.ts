import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const { query, closeDatabase } = await import("../src/lib/db");
const { jobSchema } = await import("../src/lib/domain");
const [owner] = await query<{ id: string }>(
  'SELECT id FROM "user" WHERE lower(email)=lower($1)',
  [process.env.HUB_OWNER_EMAIL],
);
if (!owner) throw new Error("Create the owner account first.");
let input = "";
for await (const chunk of process.stdin) input += chunk;
const job = jobSchema.parse(JSON.parse(input));
const rows = await query(
  "INSERT INTO hub_jobs(id,owner_id,revision,data,updated_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id",
  [job.id, owner.id, job.revision, JSON.stringify(job), job.updatedAt],
);
await closeDatabase();
console.log(
  rows.length
    ? "Lead imported privately."
    : "Lead already exists; no changes made.",
);
