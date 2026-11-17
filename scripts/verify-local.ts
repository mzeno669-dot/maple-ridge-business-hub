import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { verifyLocal } = await import("./http-checks");
const { closeDatabase } = await import("../src/lib/db");
let password = "";
for await (const chunk of process.stdin) password += chunk;
try {
  console.log(await verifyLocal(process.env.BETTER_AUTH_URL!, password.trim()));
} finally {
  await closeDatabase();
}
