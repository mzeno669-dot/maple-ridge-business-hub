import { type Job, type Overhead, lineTotal } from "./domain";

export type BookEntry = {
  job?: Job;
  id: string;
  type: "Receipt" | "Expense";
  date: string;
  description: string;
  category: string;
  amount: number;
  business?: string;
  bankReference?: string;
};

export function jobBooks(jobs: Job[], overhead: Overhead[] = []) {
  const entries: BookEntry[] = overhead.map(expense => ({ ...expense, type: "Expense" }));
  const review: { job: Job; description: string }[] = [];
  for (const job of jobs) {
    for (const payment of job.payments) {
      entries.push({ ...payment, job, type: "Receipt", description: payment.notes || payment.kind, category: payment.kind });
    }
    for (const cost of job.costs) {
      if (cost.category === "Owner labor") continue;
      const amount = lineTotal(cost.actualQty, cost.actualRate);
      if (cost.paidOn && amount !== null) {
        entries.push({ ...cost, job, type: "Expense", date: cost.paidOn, amount });
      } else if (cost.paidOn || cost.actualQty !== null || cost.actualRate !== null) {
        review.push({ job, description: cost.description || cost.category });
      }
    }
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return { entries, review };
}

export function cashTotals(entries: BookEntry[]) {
  let receipts = 0, expenses = 0;
  for (const entry of entries) {
    if (entry.type === "Receipt") receipts += entry.amount;
    else expenses += entry.amount;
  }
  return { receipts, expenses, net: receipts - expenses };
}

export function booksCsv(entries: BookEntry[]) {
  function cell(value: string) {
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  }
  const rows = entries.map(e => [e.date, e.business || "Unassigned", e.job?.title || "", e.job?.customer || "", e.type, e.category, e.description, (e.amount / 100).toFixed(2), e.bankReference || ""]);
  return [["Date","Business","Job","Customer","Type","Category","Description","Amount USD","Statement reference"], ...rows].map(row => row.map(cell).join(",")).join("\r\n");
}
