import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newJob,
  jobSchema,
  createDraft,
  summarize,
  lineTotal,
  missedCosts,
} from "../src/lib/domain";
test("blank costs remain unknown, zero is an explicit known cost", () => {
  assert.equal(lineTotal(null, 1000), null);
  assert.equal(lineTotal(1, null), null);
  assert.equal(lineTotal(1, 0), 0);
  const j = newJob("Test customer");
  assert.equal(summarize(j).estimatedComplete, false);
  assert.equal(summarize(j).variance, null);
  assert.equal(summarize(j).unallocated, null);
});
test("fractional labor, deposits, margins, and overruns use cents", () => {
  const j = newJob("Test customer");
  j.quotedTotal = 100000;
  j.costs = [
    {
      id: "labor",
      category: "Owner labor",
      description: "Install",
      unit: "hours",
      estimatedQty: 3.5,
      estimatedRate: 4000,
      actualQty: 4.25,
      actualRate: 4000,
    },
  ];
  j.payments = [
    {
      id: "deposit",
      date: "2026-11-14",
      amount: 25000,
      kind: "Deposit",
      method: "Check",
      notes: "",
    },
  ];
  const s = summarize(j);
  assert.equal(s.estimated, 14000);
  assert.equal(s.actual, 17000);
  assert.equal(s.variance, 3000);
  assert.equal(s.paid, 25000);
  assert.equal(s.unallocated, 75000);
  assert.equal(s.plannedMargin, 86000);
});
test("every document starts as a draft and server schema rejects approval", () => {
  const j = newJob("Test customer");
  for (const kind of [
    "Estimate",
    "Invoice",
    "Change order",
    "Customer message",
  ] as const) {
    const doc = createDraft(j, kind);
    assert.equal(doc.status, "draft");
    assert.equal(doc.quotedTotal, null);
    assert.ok(jobSchema.safeParse({ ...j, documents: [doc] }).success);
    assert.equal(
      jobSchema.safeParse({ ...j, documents: [{ ...doc, status: "approved" }] })
        .success,
      false,
    );
  }
});
test("rejects nonfinite money, negative payments, invalid dates, and inverted counts", () => {
  const j = newJob("Test customer");
  assert.equal(
    jobSchema.safeParse({ ...j, quotedTotal: Infinity }).success,
    false,
  );
  assert.equal(
    jobSchema.safeParse({ ...j, windowMin: 9, windowMax: 6 }).success,
    false,
  );
  assert.equal(
    jobSchema.safeParse({
      ...j,
      payments: [
        {
          id: "a",
          date: "2026-02-30",
          amount: 100,
          kind: "Deposit",
          method: "",
          notes: "",
        },
      ],
    }).success,
    false,
  );
  assert.equal(
    jobSchema.safeParse({
      ...j,
      payments: [
        {
          id: "a",
          date: "2026-11-14",
          amount: -1,
          kind: "Deposit",
          method: "",
          notes: "",
        },
      ],
    }).success,
    false,
  );
});
test("cost checks preserve unconfirmed contact, measurements, access, and prices", () => {
  const warnings = missedCosts(newJob("Test customer"));
  assert.ok(warnings.some((x) => x.includes("address")));
  assert.ok(warnings.some((x) => x.includes("measurements")));
  assert.ok(warnings.some((x) => x.includes("helper labor")));
  assert.ok(warnings.some((x) => x.includes("customer price")));
});

test("deck and general leads get relevant draft messages and pricing reminders", () => {
  for (const [title, expected] of [
    ["Deck repair", /deck area/i],
    ["Front door refinishing", /measurements needed/i],
  ] as const) {
    const job = { ...newJob("Sample customer"), title };
    const draft = createDraft(job, "Customer message");
    assert.equal(draft.status, "draft");
    assert.ok(draft.body.includes(title));
    assert.match(missedCosts(job).join(" "), expected);
    assert.doesNotMatch([draft.body, ...missedCosts(job)].join(" "), /window|each opening/i);
  }
});

test("replacement leads and existing window records retain window questions", () => {
  for (const job of [
    { ...newJob("Sample customer"), title: "Window replacement" },
    { ...newJob("Sample customer"), windowMin: 3 },
  ]) {
    assert.match(createDraft(job, "Customer message").body, /approximate sizes/);
    assert.ok(missedCosts(job).includes("Measure each opening before pricing."));
  }
});
