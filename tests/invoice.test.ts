import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InvoiceTotals } from "../src/components/invoice-totals";

test("invoice preview and print show the invoice total, all payments and remaining balance", () => {
  function render(total: number | null, amounts: number[]) {
    const payments = amounts.map((amount, index) => ({
      id: String(index), date: "2026-11-25", amount, kind: "Deposit" as const, method: "Check", notes: "",
    }));
    return renderToStaticMarkup(createElement(InvoiceTotals, { total, payments })).replace(/<[^>]+>/g, " ");
  }
  assert.match(render(100000, [25000]), /Invoice total\s+\$1,000.00\s+Payments received\s+\$250.00\s+Balance due\s+\$750.00/);
  assert.match(render(100000, []), /Balance due\s+\$1,000.00/);
  assert.match(render(100000, [25000, 75000]), /Balance due\s+\$0.00/);
  assert.match(render(100000, [110000]), /Balance due\s+\$0.00\s+Customer credit\s+\$100.00/);
  assert.match(render(null, [25000]), /Balance due\s+Not priced/);
});
