"use client";
import {useState} from "react";
import type {BookEntry} from "@/lib/books";
import {formatMoney} from "@/lib/domain";
import {candidates, readStatement, type BankLine} from "@/lib/statement";

export default function Statement({entries}: {entries: BookEntry[]}) {
  const [lines, setLines] = useState<BankLine[]>([]);
  const [error, setError] = useState("");
  return <details><summary>Compare a bank statement</summary>
    <p>Choose one account’s OFX or QFX file. The comparison runs on this device. Suggestions use the same signed amount and dates within seven days across all jobs. Check each suggestion against your statement before saving its reference on the transaction.</p>
    <input type="file" aria-label="Bank statement" accept=".ofx,.qfx" onChange={async event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      setLines([]); setError("");
      if (!file) return;
      try {
        if (file.size > 2_000_000) throw new Error("Choose a statement smaller than 2 MB.");
        setLines(readStatement(await file.text()));
      } catch (e) {setError((e as Error).message);}
    }} />
    {error && <p role="alert">{error}</p>}
    {lines.length > 0 && <><p>{lines.length} statement transactions <button className="secondary" onClick={() => setLines([])}>Clear statement</button></p>
      <ul>{lines.map(line => {
        const matches = candidates(line,entries);
        return <li key={line.id}><strong>{line.date} · {formatMoney(line.cents)} · {line.description}</strong>
          <div>Reference {line.id}</div>
          <div>{matches.length ? "Possible matches: " + matches.map(e => e.job.title + " · " + e.category + " · " + e.date).join(", ") : "No matching job transaction"}</div>
        </li>;
      })}</ul></>}
  </details>;
}
