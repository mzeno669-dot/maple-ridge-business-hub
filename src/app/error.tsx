"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>The hub couldn’t open.</h1>
      <p>
        Your saved records haven’t changed. Try again, or check that the private
        database and sign-in are configured.
      </p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
