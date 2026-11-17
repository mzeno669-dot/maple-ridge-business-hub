import assert from "node:assert/strict";
export async function verifyLocal(base: string, password: string) {
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("Local QA only.");

  if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
    throw new Error("QA is restricted to localhost.");
  const { createAuth } = await import("../src/lib/auth");
  const { newJob, createDraft } = await import("../src/lib/domain");
  const { query, closeDatabase } = await import("../src/lib/db");
  const auth = createAuth();
  const login = await auth.api.signInEmail({
    body: { email: process.env.HUB_OWNER_EMAIL!, password: password.trim() },
    asResponse: true,
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const headers = {
    "Content-Type": "application/json",
    Origin: base,
    Cookie: cookie,
  };
  const request = (path: string, options: RequestInit = {}) =>
    fetch(base + path, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
  let testId = "";
  try {
    for (const path of ["/api/jobs", "/api/export"]) {
      const r = await fetch(base + path);
      assert.equal(r.status, 401);
    }
    const list = await request("/api/jobs");
    assert.equal(list.status, 200);
    assert.match(list.headers.get("cache-control") || "", /no-store/);
    const before = (await list.json()).jobs;
    assert.ok(Array.isArray(before));
    const seed = newJob("QA fixture — disposable");
    seed.title = "Verification fixture";
    let r = await request("/api/jobs", {
      method: "POST",
      body: JSON.stringify(seed),
    });
    assert.equal(r.status, 201);
    let job = (await r.json()).job;
    testId = job.id;
    const draft = createDraft(job, "Estimate");
    r = await request(`/api/jobs/${job.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...job,
        documents: [{ ...draft, status: "approved" }],
      }),
    });
    assert.equal(r.status, 400);
    r = await request(`/api/jobs/${job.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...job,
        notes: "QA save round trip",
        documents: [draft],
        events: [
          {
            id: "qa-event",
            date: "2026-11-20",
            time: "10:30",
            title: "QA site visit",
            notes: "",
          },
        ],
        costs: [
          {
            id: "qa-cost",
            category: "Owner labor",
            description: "QA labor",
            unit: "hours",
            estimatedQty: 3.5,
            estimatedRate: 4000,
            actualQty: 4,
            actualRate: 4000,
          },
        ],
        payments: [
          {
            id: "qa-payment",
            date: "2026-11-14",
            amount: 25000,
            kind: "Deposit",
            method: "QA only",
            notes: "",
          },
        ],
      }),
    });
    assert.equal(r.status, 200);
    const updated = (await r.json()).job;
    r = await request(`/api/jobs/${job.id}`, {
      method: "PUT",
      body: JSON.stringify(job),
    });
    assert.equal(r.status, 409);
    r = await request(`/api/jobs/${job.id}`);
    const read = (await r.json()).job;
    assert.equal(read.notes, "QA save round trip");
    assert.equal(read.documents[0].status, "draft");
    assert.equal(read.events[0].time, "10:30");
    assert.equal(read.payments[0].amount, 25000);
    r = await request(`/api/jobs/${job.id}`, {
      method: "PUT",
      headers: { Origin: "https://untrusted.example" },
      body: JSON.stringify(updated),
    });
    assert.equal(r.status, 403);
    r = await request(`/api/jobs/${job.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "image/svg+xml", "X-File-Name": "bad.svg" },
      body: "<svg></svg>",
    });
    assert.equal(r.status, 415);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ9sAAAAASUVORK5CYII=",
      "base64",
    );
    r = await request(`/api/jobs/${job.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "image/png", "X-File-Name": "qa-fixture.png" },
      body: png,
    });
    assert.equal(r.status, 201);
    const photo = (await r.json()).photo;
    r = await fetch(base + `/api/photos/${photo.id}`);
    assert.equal(r.status, 401);
    r = await request(`/api/photos/${photo.id}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
    r = await request("/api/export");
    const backup = await r.json();
    assert.equal(backup.format, "maple-ridge-hub-backup");
    assert.ok(backup.jobs.some((j: { id: string }) => j.id === job.id));
    assert.ok(backup.photos.some((p: { id: string }) => p.id === photo.id));
    return {
      passed: true,
      checks: [
        "Anonymous job and backup access blocked",
        "Authenticated job creation and save",
        "Draft-only document status enforced",
        "Stale revision rejected",
        "Calendar event persisted",
        "Cost and deposit persisted",
        "Untrusted origin rejected",
        "Unsafe image upload rejected",
        "Private photo stored and retrieved",
        "Anonymous photo read blocked",
        "Backup includes saved records and photos",
      ],
    };
  } finally {
    if (testId) {
      await query("DELETE FROM hub_attachments WHERE job_id=$1", [testId]);
      await query("DELETE FROM hub_jobs WHERE id=$1", [testId]);
    }
    await auth.api.signOut({ headers: new Headers({ cookie }) });
  }
}
