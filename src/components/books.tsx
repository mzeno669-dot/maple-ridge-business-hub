"use client";
import { useState } from "react";
import { businessNames, formatMoney, type Job } from "@/lib/domain";
import Statement from "./statement";
import { booksCsv, cashTotals, jobBooks, type BookEntry } from "@/lib/books";

type Business = typeof businessNames[number];
type Props = { jobs: Job[]; save: (job: Job) => Promise<Job | null>; busy: boolean; openCosts: (job: Job) => void };

export default function Books({ jobs, save, busy, openCosts }: Props) {
  const currentYear = new Intl.DateTimeFormat("en-US", {year:"numeric", timeZone:"America/New_York"}).format(new Date());
  const [year, setYear] = useState(currentYear);
  const [business, setBusiness] = useState("All businesses");
  const [rate, setRate] = useState("");
  const {entries, review} = jobBooks(jobs);
  const years = [...new Set([currentYear, ...entries.map(e => e.date.slice(0,4))])].sort().reverse();
  const visible = entries.filter(e => e.date.startsWith(year) && (business === "All businesses" || (e.business || "Unassigned") === business));
  const {receipts, expenses, net} = cashTotals(visible);
  function download() {
    const url = URL.createObjectURL(new Blob([booksCsv(visible)], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Maple-Ridge-job-books-" + year + ".csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function classify(entry: BookEntry, form: FormData) {
    const changes = { business: (form.get("business") || undefined) as Business | undefined, bankReference: String(form.get("reference") || "").trim() };
    const job = entry.job;
    const key = entry.type === "Expense" ? "costs" : "payments";
    await save({...job, [key]: job[key].map(item => item.id === entry.id ? {...item, ...changes} : item)});
  }
  return <section className="books">
    <div className="books-filters">
      <label>Year<select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      <label>Business<select value={business} onChange={e => setBusiness(e.target.value)}>{["All businesses", ...businessNames, "Unassigned"].map(b => <option key={b}>{b}</option>)}</select></label>
      <button className="secondary" onClick={download} disabled={!visible.length}>Export year-end CSV</button>
    </div>
    <dl className="books-summary">{Object.entries({"Job receipts": receipts, "Paid job expenses": expenses, "Net job cash": net}).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatMoney(value)}</dd></div>)}</dl>
    <details><summary>Plan a tax reserve</summary>
      <p>Try a percentage of positive net job cash for this period. A household tax estimate also needs other income, deductions, withholding and payments.</p>
      <label>Set-aside percentage <input type="number" min="0" max="100" step="any" value={rate} onChange={e => setRate(e.target.value)} /></label>
      {rate !== "" && +rate >= 0 && +rate <= 100 && <p>Planning reserve <strong>{formatMoney(Math.round(Math.max(0, net) * +rate / 100))}</strong></p>}
    </details>
    {!!review.length && <details><summary>Job costs awaiting amount or payment date ({review.length}, all years)</summary>
      {review.map(({job,description}, i) => <p key={i}><button className="secondary" onClick={() => openCosts(job)}>{job.title} · {description}</button></p>)}</details>}
    <Statement entries={entries} />
    <h2>Transactions</h2>
    {!visible.length && <p>No saved transactions for this selection. Record a received payment or enter the actual cost and date paid on a job.</p>}
    {visible.map(e => <details key={JSON.stringify([e.job.id,e.type,e.id])}>
      <summary>{e.date} · {e.job.title} · {e.category} · {e.type} {formatMoney(e.amount)}</summary>
      <p>{e.description} · {e.job.customer}</p>
      <form className="books-filters" onSubmit={event => {event.preventDefault(); void classify(e, new FormData(event.currentTarget));}}>
        <label>Business<select name="business" defaultValue={e.business || ""}><option value="">Unassigned</option>{businessNames.map(b => <option key={b}>{b}</option>)}</select></label>
        <label>Matched statement reference<input name="reference" maxLength={120} defaultValue={e.bankReference} placeholder="Enter after checking statement" /></label>
        <button disabled={busy} className="secondary">Save details</button>
      </form>
    </details>)}
  </section>;
}
