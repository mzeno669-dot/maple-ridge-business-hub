import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const { createAuth } = await import("../src/lib/auth");
const { query, closeDatabase } = await import("../src/lib/db");
if (!process.env.HUB_OWNER_EMAIL) throw new Error("Set HUB_OWNER_EMAIL first.");
if ((await query('SELECT id FROM "user" LIMIT 1')).length)
  throw new Error(
    "An account already exists. This command never adds another account.",
  );
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.trim();
if (password.length < 12)
  throw new Error("Pass a password of at least 12 characters through stdin.");
await createAuth(true).api.signUpEmail({
  body: { email: process.env.HUB_OWNER_EMAIL, name: "Michael", password },
});
await closeDatabase();
console.log("Owner account created. Public registration remains disabled.");
