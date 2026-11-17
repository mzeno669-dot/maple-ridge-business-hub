import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
const dir = mkdtempSync(join(tmpdir(), "maple-ridge-auth-"));
process.env.HUB_SQLITE_PATH = join(dir, "auth.db");
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("hex");
process.env.BETTER_AUTH_URL = "http://localhost:3000";
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const { createAuth } = await import("../src/lib/auth");
const { closeDatabase } = await import("../src/lib/db");
const { getMigrations } = await import("better-auth/db/migration");
const bootstrap = createAuth(true);
const migrations = await getMigrations(bootstrap.options);
await migrations.runMigrations();
const password = randomBytes(24).toString("hex");
await bootstrap.api.signUpEmail({
  body: { email: "owner@example.test", name: "Test owner", password },
});
const auth = createAuth();
after(async () => {
  await closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
const post = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  auth.handler(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
test("anonymous session reveals no account", async () => {
  const response = await auth.handler(
    new Request("http://localhost:3000/api/auth/get-session"),
  );
  assert.equal(await response.json(), null);
});
test("public registration is disabled", async () => {
  const response = await post("sign-up/email", {
    email: "outsider@example.test",
    name: "Outsider",
    password,
  });
  assert.ok(response.status >= 400);
});
test("wrong password rejected, correct password creates HttpOnly session, sign-out invalidates it", async () => {
  const wrong = await post("sign-in/email", {
    email: "owner@example.test",
    password: "incorrect-password-123",
  });
  assert.equal(wrong.status, 401);
  const login = await post("sign-in/email", {
    email: "owner@example.test",
    password,
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie") || "";
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  const sessionCookie = cookie.split(";")[0];
  const session = await auth.handler(
    new Request("http://localhost:3000/api/auth/get-session", {
      headers: { cookie: sessionCookie },
    }),
  );
  assert.equal((await session.json()).user.email, "owner@example.test");
  const signout = await post("sign-out", {}, { cookie: sessionCookie });
  assert.equal(signout.status, 200);
  const gone = await auth.handler(
    new Request("http://localhost:3000/api/auth/get-session", {
      headers: { cookie: sessionCookie },
    }),
  );
  assert.equal(await gone.json(), null);
});
test("untrusted origin cannot sign in", async () => {
  const response = await post(
    "sign-in/email",
    { email: "owner@example.test", password },
    { Origin: "https://untrusted.example" },
  );
  assert.equal(response.status, 403);
});
