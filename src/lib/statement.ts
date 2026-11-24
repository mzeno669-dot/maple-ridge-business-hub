import type { BookEntry } from "./books";

export type BankLine = { id: string; date: string; cents: number; description: string };

// OFX 1.x may omit closing tags on scalar values. OFX 2.x uses XML.
function field(block: string, name: string) {
  return block.match(new RegExp("<" + name + ">([^<\\r\\n]*)", "i"))?.[1].trim() || "";
}
export function readStatement(source: string): BankLine[] {
  const blocks = source.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  if (!blocks.length) throw new Error("Choose an OFX or QFX statement with posted transactions.");
  const seen = new Set<string>();
  return blocks.map(block => {
    const id = field(block,"FITID"), raw = field(block,"TRNAMT"), posted = field(block,"DTPOSTED");
    if (!id || seen.has(id) || !/^-?\d+(\.\d{1,2})?$/.test(raw) || !/^\d{8}/.test(posted))
      throw new Error("This statement contains a missing, repeated, or unsupported transaction. Compare it manually.");
    seen.add(id);
    const date = posted.slice(0,4) + "-" + posted.slice(4,6) + "-" + posted.slice(6,8);
    const cents = Math.round(Number(raw) * 100);
    if (!Number.isSafeInteger(cents) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)
      throw new Error("Check the dates and amounts in this statement.");
    return {id, date, cents, description:field(block,"NAME") || field(block,"MEMO")};
  });
}

export function candidates(line: BankLine, entries: BookEntry[]) {
  return entries.filter(e => {
    const days = Math.abs(Date.parse(e.date) - Date.parse(line.date)) / 86400000;
    return days <= 7 && (e.type === "Receipt" ? e.amount : -e.amount) === line.cents;
  });
}
