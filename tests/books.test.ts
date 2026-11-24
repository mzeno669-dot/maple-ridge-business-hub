import {test} from "node:test";
import assert from "node:assert/strict";
import {newJob, jobSchema} from "../src/lib/domain";
import {jobBooks, cashTotals, booksCsv} from "../src/lib/books";
test("a bank-matched deposit and paid lift expense flow once into the year-end books", () => {
  const job = newJob("Test customer");
  job.title = "=Test";
  job.payments.push({id:"p",date:"2026-11-21", amount:300000,kind:"Deposit",method:"Check",notes:"",bankReference:"Statement 1"});
  const cost = {id:"c", category:"Equipment rental" as const,description:"Lift", estimatedQty:1,actualQty:1,unit:"each", estimatedRate:99000,actualRate:120000, paidOn:"2026-11-20"};
  job.costs.push(cost, {...cost,id:"owner",category:"Owner labor"}, {...cost,id:"pending",paidOn:undefined});
  const {entries, review} = jobBooks([jobSchema.parse(JSON.parse(JSON.stringify(job)))]);
  assert.deepEqual(cashTotals(entries), {receipts:300000, expenses:120000, net:180000});
  assert.equal(review.length,1);
  assert.match(booksCsv(entries), /"'=Test"/);
  assert.match(booksCsv(entries), /1200\.00/);
});

import {candidates, readStatement} from "../src/lib/statement";
test("QFX comparison checks sign and dates and leaves both books and bank file untouched", () => {
  const [line] = readStatement("<STMTTRN><DTPOSTED>20261123000000<TRNAMT>3000.00<FITID>abc<NAME>Deposit</STMTTRN>");
  const job = newJob("Fixture");
  job.payments.push({id:"p",date:"2026-11-21",amount:300000,kind:"Deposit",method:"",notes:""});
  const {entries} = jobBooks([job]);
  assert.equal(candidates(line,entries).length,1);
  assert.equal(candidates({...line,cents:-300000},entries).length,0);
  assert.equal(candidates({...line,date:"2026-12-20"},entries).length,0);
  assert.equal(job.payments.length,1);
  assert.throws(() => readStatement("broken"));
});
