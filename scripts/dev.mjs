import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const option = (names, fallback) => {
  const i = args.findIndex((a) => names.includes(a));
  return i >= 0 ? args[i + 1] : fallback;
};
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--hostname",
    option(["--host", "--hostname"], "127.0.0.1"),
    "--port",
    option(["--port"], process.env.PORT || "3000"),
  ],
  { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
