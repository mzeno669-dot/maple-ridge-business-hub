import { formatMoney, type Job } from "../lib/domain";

export function InvoiceTotals({ total, payments }: {
  total: number | null;
  payments: Job["payments"];
}) {
  const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = total === null ? null : total - received;
  return (
    <>
      <div className="document-total"><span>Invoice total</span><strong>{formatMoney(total)}</strong></div>
      <div className="document-total"><span>Payments received</span><strong>{formatMoney(received)}</strong></div>
      <div className="document-total"><span>Balance due</span><strong>{formatMoney(balance === null ? null : Math.max(0, balance))}</strong></div>
      {balance !== null && balance < 0 && (
        <div className="document-total"><span>Customer credit</span><strong>{formatMoney(-balance)}</strong></div>
      )}
    </>
  );
}
