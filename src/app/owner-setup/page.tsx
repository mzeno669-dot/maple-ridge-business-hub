"use client";

import { useEffect, useState } from "react";

export default function OwnerSetup() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const value = window.location.hash.slice(1);
    if (value) {
      setToken(value);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return <main className="login-form">
    <h1>Set your Business Hub password</h1>
    {done ? <p>Password saved. <a href="/sign-in">Sign in to the Hub</a></p> : !token ?
      <p>Open your private setup link to continue.</p> :
      <form onSubmit={async event => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const password = values.get("password");
        if (password !== values.get("confirm")) {
          setMessage("Enter the same password in both fields.");
          return;
        }
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword: password }),
          });
          if (response.ok) { setDone(true); setToken(""); }
          else setMessage("Setup failed. Check that the link is current and has not been used.");
        } catch { setMessage("Connection interrupted. Try signing in before retrying setup."); }
        finally { setBusy(false); }
      }}>
        <label>New password (12–128 characters)<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
        <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required /></label>
        {message && <p role="alert">{message}</p>}
        <button className="primary" disabled={busy}>Save password</button>
      </form>}
  </main>;
}
