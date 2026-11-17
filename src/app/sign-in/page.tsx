"use client";
import { useState } from "react";
import { TreePine, LockKeyhole, ArrowRight } from "lucide-react";
export default function SignIn() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <TreePine size={38} />
          <span>
            MAPLE RIDGE<small>HOME & PROPERTY SOLUTIONS LLC</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">YOUR BUSINESS. ALL TOGETHER.</span>
          <h1>
            Good work starts
            <br />
            with a clear plan.
          </h1>
          <p>
            From the first phone call to the final payment.
            <br />A little more organized. A lot more peace of mind.
          </p>
        </div>
        <small>Castleton, Vermont · Rutland & Addison Counties</small>
      </section>
      <section className="login-form">
        <div className="lock-mark">
          <LockKeyhole />
        </div>
        <span className="eyebrow">PRIVATE BUSINESS HUB</span>
        <h2>Welcome back.</h2>
        <p>Sign in to your Maple Ridge workspace.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/auth/sign-in/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: f.get("email"),
                  password: f.get("password"),
                }),
              });
              if (!r.ok)
                throw new Error(
                  "Unable to sign in. Check your email and password, then try again.",
                );
              window.location.assign("/");
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="Your email address"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={12}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary">
            {busy ? "Signing in…" : "Open my hub"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="small-note">
          <LockKeyhole size={14} /> Owner access only. No public registration.
        </p>
      </section>
    </main>
  );
}
