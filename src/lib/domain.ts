import { z } from "zod";

export const stages = [
  "New lead",
  "Site visit",
  "Estimating",
  "Scheduled",
  "In progress",
  "Complete",
  "Closed",
] as const;
export const categories = [
  "Materials",
  "Owner labor",
  "Helper labor",
  "Travel",
  "Equipment rental",
  "Disposal",
  "Other",
] as const;
const text = z.string().max(20000);
const money = z.number().int().min(0).max(1000000000).nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
const id = z.string().min(1).max(100);
export const costSchema = z.object({
  id,
  category: z.enum(categories),
  description: text,
  estimatedQty: z.number().min(0).max(100000).nullable(),
  actualQty: z.number().min(0).max(100000).nullable(),
  unit: z.string().max(40),
  estimatedRate: money,
  actualRate: money,
});
export const documentSchema = z.object({
  id,
  kind: z.enum(["Estimate", "Invoice", "Change order", "Customer message"]),
  status: z.literal("draft"),
  title: z.string().min(1).max(200),
  body: text,
  customer: text,
  location: text,
  createdAt: z.string(),
  quotedTotal: money,
});
export const jobSchema = z
  .object({
    id,
    revision: z.number().int().min(0),
    title: z.string().min(1).max(200),
    customer: z.string().min(1).max(200),
    phone: z.string().max(80),
    email: z.union([z.literal(""), z.email()]),
    address: text,
    city: z.string().max(120),
    state: z.string().max(40),
    zip: z.string().max(20),
    stage: z.enum(stages),
    urgency: z.enum(["ASAP", "Normal", "Flexible"]),
    scope: text,
    notes: text,
    windowMin: z.number().int().min(0).max(999).nullable(),
    windowMax: z.number().int().min(0).max(999).nullable(),
    windowType: text,
    access: text,
    measurements: z
      .array(
        z.object({
          id,
          location: text,
          width: z.number().positive().max(1000).nullable(),
          height: z.number().positive().max(1000).nullable(),
          notes: text,
        }),
      )
      .max(300),
    checklist: z
      .array(
        z.object({ id, label: z.string().min(1).max(500), done: z.boolean() }),
      )
      .max(300),
    costs: z.array(costSchema).max(500),
    quotedTotal: money,
    payments: z
      .array(
        z.object({
          id,
          date,
          amount: z.number().int().positive().max(1000000000),
          kind: z.enum(["Deposit", "Progress", "Final"]),
          method: text,
          notes: text,
        }),
      )
      .max(500),
    events: z
      .array(
        z.object({
          id,
          date,
          time: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
          title: z.string().min(1).max(200),
          notes: text,
        }),
      )
      .max(300),
    documents: z.array(documentSchema).max(300),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()
  .refine(
    (j) =>
      j.windowMin === null ||
      j.windowMax === null ||
      j.windowMin <= j.windowMax,
    {
      message: "Minimum window count must not exceed maximum.",
      path: ["windowMax"],
    },
  );
export type Job = z.infer<typeof jobSchema>;
export type Cost = z.infer<typeof costSchema>;
export type DraftDocument = z.infer<typeof documentSchema>;
export type Attachment = {
  id: string;
  jobId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export function newJob(customer = ""): Job {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    revision: 0,
    title: "New project",
    customer,
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "VT",
    zip: "",
    stage: "New lead",
    urgency: "Normal",
    scope: "",
    notes: "",
    windowMin: null,
    windowMax: null,
    windowType: "",
    access: "",
    measurements: [],
    checklist: [],
    costs: [],
    quotedTotal: null,
    payments: [],
    events: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function lineTotal(qty: number | null, rate: number | null) {
  return qty === null || rate === null ? null : Math.round(qty * rate);
}
export function summarize(job: Job) {
  const estimated = job.costs.map((c) =>
    lineTotal(c.estimatedQty, c.estimatedRate),
  );
  const actual = job.costs.map((c) => lineTotal(c.actualQty, c.actualRate));
  const sum = (a: (number | null)[]) =>
    a.reduce<number>((s, v) => s + (v ?? 0), 0);
  const estimatedComplete =
    estimated.length > 0 && estimated.every((v) => v !== null);
  const actualComplete = actual.length > 0 && actual.every((v) => v !== null);
  const paid = job.payments.reduce((s, p) => s + p.amount, 0);
  return {
    estimated: sum(estimated),
    actual: sum(actual),
    estimatedComplete,
    actualComplete,
    paid,
    variance:
      estimatedComplete && actualComplete ? sum(actual) - sum(estimated) : null,
    plannedMargin:
      job.quotedTotal !== null && estimatedComplete
        ? job.quotedTotal - sum(estimated)
        : null,
    unallocated: job.quotedTotal === null ? null : job.quotedTotal - paid,
  };
}
export const formatMoney = (cents: number | null) =>
  cents === null
    ? "Not priced"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
export function missedCosts(job: Job) {
  const warnings: string[] = [];
  if (!job.address) warnings.push("Confirm the full property address.");
  if (!job.phone && !job.email)
    warnings.push("Add a phone number or email for follow-up.");
  if (!job.windowType)
    warnings.push("Confirm window type and who supplies the windows.");
  if (!job.measurements.length)
    warnings.push("Measure each opening before pricing.");
  if (!job.access)
    warnings.push("Confirm floor, access, and any lift or staging needs.");
  for (const c of categories.filter((c) => c !== "Other"))
    if (
      !job.costs.some(
        (x) =>
          x.category === c &&
          x.estimatedQty !== null &&
          x.estimatedRate !== null,
      )
    )
      warnings.push(
        `Review ${c.toLowerCase()} cost; enter a confirmed amount or $0 if not needed.`,
      );
  if (job.quotedTotal === null)
    warnings.push(
      "Set a draft customer price after scope and costs are confirmed.",
    );
  return warnings;
}
export function createDraft(
  job: Job,
  kind: DraftDocument["kind"],
): DraftDocument {
  const location = [
    job.address,
    [job.city, job.state, job.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  let body = job.scope || "Scope to be confirmed after a site visit.";
  if (kind === "Customer message")
    body = `Hi ${job.customer}, thanks for reaching out to Maple Ridge Home & Property Solutions LLC. I can take a look at your window project${job.city ? ` in ${job.city}` : ""}. Could you send the property address, a few photos, approximate window sizes, the number you want replaced, and which floor they are on? Please also let me know whether you already have the windows and a good time to reach you. Once I have those details, we can arrange a visit and prepare an estimate. Thank you, Michael`;
  if (kind === "Change order")
    body =
      "Describe the requested scope change, reason, added or reduced price, and schedule impact. Owner review and customer agreement are pending.";
  return {
    id: crypto.randomUUID(),
    kind,
    status: "draft",
    title: `${kind} — ${job.title}`,
    body,
    customer: job.customer,
    location,
    createdAt: new Date().toISOString(),
    quotedTotal:
      kind === "Customer message" || kind === "Change order"
        ? null
        : job.quotedTotal,
  };
}
