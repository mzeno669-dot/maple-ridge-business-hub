import { query } from "./db";
import { Job, jobSchema } from "./domain";
import { HttpError } from "./errors";
export async function listJobs(ownerId: string): Promise<Job[]> {
  return (
    await query<{ data: string }>(
      "SELECT data FROM hub_jobs WHERE owner_id=$1 ORDER BY updated_at DESC",
      [ownerId],
    )
  ).map((r) => jobSchema.parse(JSON.parse(r.data)));
}
export async function getJob(id: string, ownerId: string): Promise<Job> {
  const [row] = await query<{ data: string }>(
    "SELECT data FROM hub_jobs WHERE id=$1 AND owner_id=$2",
    [id, ownerId],
  );
  if (!row) throw new HttpError(404, "Job not found.");
  return jobSchema.parse(JSON.parse(row.data));
}
export async function insertJob(job: Job, ownerId: string) {
  const next = jobSchema.parse({
    ...job,
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const rows = await query(
    "INSERT INTO hub_jobs(id,owner_id,revision,data,updated_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id",
    [next.id, ownerId, next.revision, JSON.stringify(next), next.updatedAt],
  );
  if (!rows.length)
    throw new HttpError(
      409,
      "This job already exists. Reload to open the saved record.",
    );
  return next;
}
export async function updateJob(job: Job, ownerId: string) {
  const current = await getJob(job.id, ownerId);
  const next = jobSchema.parse({
    ...job,
    revision: job.revision + 1,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
  const rows = await query(
    "UPDATE hub_jobs SET data=$1,revision=$2,updated_at=$3 WHERE id=$4 AND owner_id=$5 AND revision=$6 RETURNING id",
    [
      JSON.stringify(next),
      next.revision,
      next.updatedAt,
      next.id,
      ownerId,
      job.revision,
    ],
  );
  if (!rows.length)
    throw new HttpError(
      409,
      "This job changed in another tab. Reload before saving so no changes are overwritten.",
    );
  return next;
}
