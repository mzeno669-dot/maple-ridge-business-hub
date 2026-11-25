import { listOverhead, saveOverhead } from "@/lib/overhead";
import { overheadSchema } from "@/lib/domain";
import { fail, json, readJson, requireOrigin, requireOwner } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const owner = await requireOwner();
    return json({ overhead: await listOverhead(owner.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireOrigin(request);
    const owner = await requireOwner();
    const expense = overheadSchema.parse(await readJson(request, 8192));
    await saveOverhead(owner.id, expense);
    return json({ expense });
  } catch (error) {
    return fail(error);
  }
}
