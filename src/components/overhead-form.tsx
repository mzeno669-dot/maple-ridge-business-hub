"use client";

import { useState } from "react";
import { businessNames, overheadCategories, overheadSchema, type Overhead } from "@/lib/domain";

export default function OverheadForm({ expense, onSave, onCancel }: {
  expense?: Overhead;
  onSave: (expense: Overhead) => void;
  onCancel: () => void;
}) {
  const [id] = useState(() => expense?.id ?? crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return <form className="books-filters" onSubmit={async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const parsed = overheadSchema.safeParse({
      ...Object.fromEntries(fields), id,
      amount: Math.round(Number(fields.get("amount")) * 100),
    });
    if (!parsed.success) {
      setError("Check the business, date, description and amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/books", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("Could not save the expense. Try again.");
      onSave(parsed.data);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }}>
    <label>Business<select name="business" required defaultValue={expense?.business || ""}>
      <option value="">Choose a business</option>
      {businessNames.map(name => <option key={name}>{name}</option>)}
    </select></label>
    <label>Date paid<input type="date" name="date" required defaultValue={expense?.date} /></label>
    <label>Category<select name="category" required defaultValue={expense?.category || ""}>
      <option value="">Choose a category</option>
      {overheadCategories.map(category => <option key={category}>{category}</option>)}
    </select></label>
    <label>Description<input name="description" required maxLength={300} defaultValue={expense?.description} /></label>
    <label>Amount ($)<input name="amount" type="number" min="0.01" max="10000000" step="0.01" required defaultValue={expense && (expense.amount / 100).toFixed(2)} /></label>
    <label>Statement reference<input name="bankReference" maxLength={120} defaultValue={expense?.bankReference} /></label>
    <button className="secondary" disabled={busy}>{busy ? "Saving…" : "Save expense"}</button>
    <button className="secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
