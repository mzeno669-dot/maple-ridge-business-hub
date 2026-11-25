"use client";
import { useEffect, useState } from "react";
import { businessNames, formatMoney, type Job, type Overhead } from "@/lib/domain";
import OverheadForm from "./overhead-form";
import Statement from "./statement";
import { booksCsv, cashTotals, jobBooks, type BookEntry } from "@/lib/books";

type Business = typeof businessNames[number];
type Props = { jobs: Job[]; save: (job: Job) => Promise<Job | null>; busy: boolean; openCosts: (job: Job) => void };

export default function Books({ jobs, save, busy, openCosts }: Props) {
  const currentYear = new Intl.DateTimeFormat("en-US", {year:"numeric", timeZone:"America/New_York"}).format(new Date());
  const [year, setYear] = useState(currentYear);
  const [business, setBusiness] = useState("All businesses");
  const [rate, setRate] = useState("");
  const [overhead, setOverhead] = useState<Overhead[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const request = new AbortController();
    fetch("/api/books", { signal: request.signal })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(data => setOverhead(data.overhead))
      .catch(() => { if (!request.signal.aborted) setLoadError(true); });
    return () => request.abort();
  }, []);

  const {entries, review} = jobBooks(jobs, overhead ?? []);
  function savedExpense(expense: Overhead) {
    setOverhead(current => [...(current ?? []).filter(item => item.id !== expense.id), expense]);
    setYear(expense.date.slice(0, 4));
    setBusiness(expense.business);
    setEditing(null);
  }
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
    if (!job) return;
    const key = entry.type === "Expense" ? "costs" : "payments";
    await save({...job, [key]: job[key].map(item => item.id === entry.id ? {...item, ...changes} : item)});
  }
  if (loadError) return <p role="alert">The books could not load. Reopen Books &amp; taxes to retry.</p>;
  if (!overhead) return <p role="status">Loading books…</p>;

  const unassigned = entries.filter(entry => entry.date.startsWith(year) && !entry.business);
  const expenseCategories = [...new Set(visible.filter(entry => entry.type === "Expense").map(entry => entry.category))].sort();

  return <section className="books">
    <div className="books-filters">
      <label>Year<select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      <label>Business<select value={business} onChange={e => setBusiness(e.target.value)}>{["All businesses", ...businessNames, "Unassigned"].map(b => <option key={b}>{b}</option>)}</select></label>
      <button className="secondary" onClick={download} disabled={!visible.length}>Export year-end CSV</button>
    </div>
    <dl className="books-summary">{Object.entries({"Receipts": receipts, "Paid business expenses": expenses, "Net business cash": net}).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatMoney(value)}</dd></div>)}</dl>
    <details><summary>Plan a tax reserve</summary>
      <p>Try a percentage of positive net business cash for this period. A household tax estimate also needs other income, deductions, withholding and payments.</p>
      <label>Set-aside percentage <input type="number" min="0" max="100" step="any" value={rate} onChange={e => setRate(e.target.value)} /></label>
      {rate !== "" && +rate >= 0 && +rate <= 100 && <p>Planning reserve <strong>{formatMoney(Math.round(Math.max(0, net) * +rate / 100))}</strong></p>}
    </details>
    {!!review.length && <details><summary>Job costs awaiting amount or payment date ({review.length}, all years)</summary>
      {review.map(({job,description}, i) => <p key={i}><button className="secondary" onClick={() => openCosts(job)}>{job.title} · {description}</button></p>)}</details>}
    <details><summary>Year-end review</summary>
      <p>Review cash activity for {year} and export the transactions for your tax preparer.</p>
      {unassigned.length > 0 && <p>{unassigned.length} transactions have no business assigned. <button type="button" className="secondary" onClick={() => setBusiness("Unassigned")}>Review unassigned transactions</button></p>}
      {expenseCategories.length > 0 && <dl>{expenseCategories.map(category => <div key={category}>
        <dt>{category}</dt><dd>{formatMoney(visible.filter(entry => entry.type === "Expense" && entry.category === category).reduce((sum, entry) => sum + entry.amount, 0))}</dd>
      </div>)}</dl>}
    </details>
    <Statement entries={entries} />
    <button type="button" className="secondary" disabled={editing !== null} onClick={() => setEditing("new")}>Add overhead expense</button>
    {editing === "new" && <OverheadForm key="new" onSave={savedExpense} onCancel={() => setEditing(null)} />}
    <h2>Transactions</h2>
    {!visible.length && <p>No saved transactions for this selection. Record a job payment, paid job cost, or overhead expense.</p>}
    {visible.map(e => {
      const expense = e.job ? undefined : overhead.find(item => item.id === e.id);
      return <details key={JSON.stringify([e.job?.id,e.type,e.id])}>
      <summary>{e.date} · {e.job?.title || "Business overhead"} · {e.category} · {e.type} {formatMoney(e.amount)}</summary>
      <p>{e.description}{e.job && " · " + e.job.customer}</p>
      {expense && (editing === expense.id
        ? <OverheadForm key={expense.id} expense={expense} onSave={savedExpense} onCancel={() => setEditing(null)} />
        : <button type="button" className="secondary" disabled={editing !== null} onClick={() => setEditing(expense.id)}>Edit expense</button>)}
      {e.job && <form className="books-filters" onSubmit={event => {event.preventDefault(); void classify(e, new FormData(event.currentTarget));}}>
        <label>Business<select name="business" defaultValue={e.business || ""}><option value="">Unassigned</option>{businessNames.map(b => <option key={b}>{b}</option>)}</select></label>
        <label>Matched statement reference<input name="reference" maxLength={120} defaultValue={e.bankReference} placeholder="Enter after checking statement" /></label>
        <button disabled={busy} className="secondary">Save details</button>
      </form>}
    </details>})}
  </section>;
}
