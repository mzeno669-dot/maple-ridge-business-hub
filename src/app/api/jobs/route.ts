import {
  requireOwner,
  requireOrigin,
  json,
  fail,
  readJson,
} from "@/lib/server";
import { listJobs, insertJob } from "@/lib/jobs";
import { jobSchema } from "@/lib/domain";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireOwner();
    return json({ jobs: await listJobs(user.id) });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    requireOrigin(req);
    const user = await requireOwner();
    const job = jobSchema.parse(await readJson(req));
    return json({ job: await insertJob(job, user.id) }, 201);
  } catch (e) {
    return fail(e);
  }
}
