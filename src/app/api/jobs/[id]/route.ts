import {
  requireOwner,
  requireOrigin,
  json,
  fail,
  readJson,
  HttpError,
} from "@/lib/server";
import { getJob, updateJob } from "@/lib/jobs";
import { jobSchema } from "@/lib/domain";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, ctx: Context) {
  try {
    const user = await requireOwner();
    return json({ job: await getJob((await ctx.params).id, user.id) });
  } catch (e) {
    return fail(e);
  }
}
export async function PUT(req: Request, ctx: Context) {
  try {
    requireOrigin(req);
    const user = await requireOwner();
    const job = jobSchema.parse(await readJson(req));
    if (job.id !== (await ctx.params).id)
      throw new HttpError(400, "Job ID mismatch.");
    return json({ job: await updateJob(job, user.id) });
  } catch (e) {
    return fail(e);
  }
}
