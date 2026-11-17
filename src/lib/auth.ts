import { betterAuth } from "better-auth";
import { database } from "./db";
let auth: ReturnType<typeof createAuth> | undefined;
export function createAuth(bootstrap = false) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set a strong BETTER_AUTH_SECRET before starting the hub.");
  return betterAuth({
    appName: "Maple Ridge Business Hub",
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: database(),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !bootstrap,
      minPasswordLength: 12,
    },
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
  });
}
export function getAuth() {
  return (auth ??= createAuth());
}
