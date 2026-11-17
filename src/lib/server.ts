import { headers } from "next/headers";
import { getAuth } from "./auth";
import { HttpError } from "./errors";
export { HttpError } from "./errors";
export async function requireOwner() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) throw new HttpError(401, "Sign in to open your private hub.");
  const owner = process.env.HUB_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || session.user.email.toLowerCase() !== owner)
    throw new HttpError(403, "This account does not have access to the hub.");
  return session.user;
}
export function requireOrigin(request: Request) {
  const expected = process.env.BETTER_AUTH_URL;
  const origin = request.headers.get("origin");
  if (
    !expected ||
    !origin ||
    new URL(origin).origin !== new URL(expected).origin
  )
    throw new HttpError(403, "This request came from an untrusted page.");
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error && typeof error === "object" && "issues" in error)
    return json(
      { error: "Please check the entered values.", details: error.issues },
      400,
    );
  console.error(
    "Hub request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return json(
    {
      error:
        "The hub could not complete this request. Your unsaved changes are still on screen.",
    },
    500,
  );
}
export async function readJson(request: Request, max = 1500000) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "This request is too large.");
  const raw = await request.text();
  if (Buffer.byteLength(raw) > max)
    throw new HttpError(413, "This request is too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
