import { requireOwner, fail, HttpError } from "@/lib/server";
import { query } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireOwner();
    const [photo] = await query<{ data: string; mime: string; name: string }>(
      "SELECT data,mime,name FROM hub_attachments WHERE id=$1 AND owner_id=$2",
      [(await ctx.params).id, user.id],
    );
    if (!photo) throw new HttpError(404, "Photo not found.");
    return new Response(Buffer.from(photo.data, "base64"), {
      headers: {
        "Content-Type": photo.mime,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(photo.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
