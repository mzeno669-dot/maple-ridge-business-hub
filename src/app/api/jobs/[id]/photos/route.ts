import {
  requireOwner,
  requireOrigin,
  json,
  fail,
  HttpError,
} from "@/lib/server";
import { getJob } from "@/lib/jobs";
import { query } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, ctx: Context) {
  try {
    const user = await requireOwner();
    const { id } = await ctx.params;
    await getJob(id, user.id);
    return json({
      photos: await query(
        'SELECT id,job_id AS "jobId",name,mime,size,created_at AS "createdAt" FROM hub_attachments WHERE job_id=$1 AND owner_id=$2 ORDER BY created_at DESC',
        [id, user.id],
      ),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    requireOrigin(req);
    const user = await requireOwner();
    const { id } = await ctx.params;
    await getJob(id, user.id);
    const max = 3 * 1024 * 1024;
    const reader = req.body?.getReader();
    if (!reader) throw new HttpError(400, "Choose a photo.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "Use a photo under 3 MB.");
      }
      chunks.push(value);
    }
    const data = Buffer.concat(chunks);
    let mime = "";
    if (
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    else if (
      data.length > 3 &&
      data[0] === 255 &&
      data[1] === 216 &&
      data[2] === 255
    )
      mime = "image/jpeg";
    else if (
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP"
    )
      mime = "image/webp";
    if (!mime) throw new HttpError(415, "Use a JPEG, PNG, or WebP photo.");
    const photo = {
      id: crypto.randomUUID(),
      jobId: id,
      name: decodeURIComponent(req.headers.get("x-file-name") || "photo")
        .replace(/[\x00-\x1f]/g, "")
        .slice(0, 160),
      mime,
      size,
      createdAt: new Date().toISOString(),
    };
    await query(
      "INSERT INTO hub_attachments(id,owner_id,job_id,name,mime,size,data,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        photo.id,
        user.id,
        id,
        photo.name,
        mime,
        size,
        data.toString("base64"),
        photo.createdAt,
      ],
    );
    return json({ photo }, 201);
  } catch (e) {
    return fail(e);
  }
}
