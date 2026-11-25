import { listOverhead } from "@/lib/overhead";
import { requireOwner, fail } from "@/lib/server";
import { listJobs } from "@/lib/jobs";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireOwner();
    return new Response(
      JSON.stringify(
        {
          format: "maple-ridge-hub-backup",
          version: 1,
          exportedAt: new Date().toISOString(),
          jobs: await listJobs(user.id),
          overhead: await listOverhead(user.id),
          photos: await query(
            'SELECT id,job_id AS "jobId",name,mime,size,data,created_at AS "createdAt" FROM hub_attachments WHERE owner_id=$1',
            [user.id],
          ),
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition":
            'attachment; filename="maple-ridge-private-backup.json"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return fail(e);
  }
}
