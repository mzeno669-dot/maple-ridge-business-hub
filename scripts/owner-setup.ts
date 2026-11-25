import nextEnv from "@next/env";
import { randomBytes } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
const { createAuth } = await import("../src/lib/auth");
const { query, closeDatabase } = await import("../src/lib/db");
try {
  const email = process.env.HUB_OWNER_EMAIL?.trim().toLowerCase();
  const url = new URL("/owner-setup", process.env.BETTER_AUTH_URL);
  if (!email) throw new Error("Configure HUB_OWNER_EMAIL first.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error("The setup link requires HTTPS.");
  const auth = createAuth(true);
  const accounts = await query<{id: string; email: string}>('SELECT id, email FROM "user" LIMIT 2');
  if (accounts.length && (accounts.length !== 1 || accounts[0].email !== email))
    throw new Error("Existing accounts do not match the configured owner.");
  const user = accounts[0] ?? (await auth.api.signUpEmail({
    body: { name: "Michael", email, password: randomBytes(48).toString("hex") },
  })).user;
  const token = randomBytes(32).toString("hex");
  const context = await auth.$context;
  await context.internalAdapter.createVerificationValue({
    identifier: "reset-password:" + token, value: user.id,
    expiresAt: new Date(Date.now() + 3600000),
  });
  url.hash = token;
  console.log(url.href);
} finally { await closeDatabase(); }
