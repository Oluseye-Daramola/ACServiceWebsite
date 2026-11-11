const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const Invoice = require("../Models/Invoice");
const Transaction = require("../Models/Transaction");
const { api, tokenFor, createAdmin, createTechnician, createInvoice } = require("./helpers");

useTestDb();

let adminApi;
let invoice; // total 1000
beforeEach(async () => {
  adminApi = api(tokenFor(await createAdmin()));
  invoice = await createInvoice({ items: [{ description: "AC repair", quantity: 1, unitPrice: 1000 }] });
});

const pay = (amount, extra = {}, invoiceId = invoice._id) =>
  adminApi.post("/api/transactions").send({ invoiceId: String(invoiceId), amount, method: "cash", ...extra });
const reverse = (id) => adminApi.patch(`/api/transactions/${id}/reverse`).send({ reason: "Recorded in error" });

// Invariant: amountPaid always equals the sum of successful payments and never exceeds the total
const assertConsistent = async (id = invoice._id) => {
  const inv = await Invoice.findById(id);
  const txns = await Transaction.find({ invoice: id, status: "successful" });
  const sum = txns.reduce((s, t) => s + t.amount, 0);
  assert.equal(inv.amountPaid, sum, "amountPaid matches successful transactions");
  assert.ok(inv.amountPaid <= inv.total, "never overpaid");
  return inv;
};

describe("Recording payments", () => {
  test("partial payment -> partially_paid with a TXN reference", async () => {
    const res = await pay(400, { method: "bank_transfer", paymentRef: "GTB-123" });
    assert.equal(res.status, 201);
    assert.match(res.body.transaction.reference, /^TXN-\d{4}-00001$/);
    assert.equal(res.body.invoice.status, "partially_paid");
    assert.equal(res.body.invoice.balance, 600);
    await assertConsistent();
  });

  test("paying the balance -> paid, with paidAt and a clear message", async () => {
    await pay(400);
    const res = await pay(600);
    assert.equal(res.body.invoice.status, "paid");
    assert.ok(res.body.invoice.paidAt);
    assert.equal(res.body.message, "Payment recorded. Invoice is now fully paid.");
  });

  test("more than the balance -> 400", async () => {
    const res = await pay(1000.01);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /exceeds the outstanding balance of 1000/);
  });

  test("no payments on a paid or cancelled invoice", async () => {
    await pay(1000);
    assert.match((await pay(1)).body.message, /already fully paid/);

    const other = await createInvoice();
    await adminApi.patch(`/api/invoices/${other._id}/cancel`);
    assert.equal((await pay(10, {}, other._id)).status, 400);
  });

  test("validation: positive amount, known method", async () => {
    assert.equal((await pay(0)).status, 400);
    assert.equal((await pay(-5)).status, 400);
    assert.equal((await pay(10, { method: "bitcoin" })).status, 400);
  });

  test("technicians can't record payments -> 403", async () => {
    const tech = await createTechnician();
    const res = await api(tokenFor(tech)).post("/api/transactions").send({ invoiceId: String(invoice._id), amount: 10, method: "cash" });
    assert.equal(res.status, 403);
  });
});

describe("Payments made at the same moment (no overpayment)", () => {
  test("5 simultaneous payments of 600 on a 1000 invoice -> exactly 1 accepted", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => pay(600)));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 400));
    const inv = await assertConsistent();
    assert.equal(inv.amountPaid, 600);
  });

  test("2 simultaneous payments that both fit -> both accepted, invoice paid", async () => {
    await pay(600);
    const results = await Promise.all([pay(200), pay(200)]);
    assert.deepEqual(results.map((r) => r.status), [201, 201]);
    const inv = await assertConsistent();
    assert.equal(inv.status, "paid");
  });

  test("cancel and pay at the same moment never leaves a cancelled invoice with payments", async () => {
    for (let i = 0; i < 5; i++) {
      const inv = await createInvoice();
      await Promise.all([adminApi.patch(`/api/invoices/${inv._id}/cancel`), pay(300, {}, inv._id)]);
      const after = await assertConsistent(inv._id);
      assert.ok(!(after.status === "cancelled" && after.amountPaid > 0), `round ${i}`);
    }
  });
});

describe("Reversing payments", () => {
  test("reversal recalculates the invoice and keeps an audit trail", async () => {
    await pay(400);
    const second = (await pay(600)).body.transaction;
    const res = await reverse(second._id);
    assert.equal(res.status, 200);
    assert.equal(res.body.transaction.status, "reversed");
    assert.equal(res.body.transaction.reversalReason, "Recorded in error");
    assert.ok(res.body.transaction.reversedBy);
    assert.equal(res.body.invoice.status, "partially_paid");
    assert.equal(res.body.invoice.amountPaid, 400);
    assert.equal(res.body.invoice.paidAt, undefined);
  });

  test("can't reverse twice, even at the same moment", async () => {
    const txn = (await pay(500)).body.transaction;
    const results = await Promise.all([reverse(txn._id), reverse(txn._id), reverse(txn._id)]);
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    const inv = await assertConsistent();
    assert.equal(inv.amountPaid, 0);
  });

  test("a reason is required", async () => {
    const txn = (await pay(500)).body.transaction;
    assert.equal((await adminApi.patch(`/api/transactions/${txn._id}/reverse`).send({})).status, 400);
  });

  test("after reversing everything, the invoice can be cancelled", async () => {
    const txn = (await pay(500)).body.transaction;
    await reverse(txn._id);
    assert.equal((await adminApi.patch(`/api/invoices/${invoice._id}/cancel`)).status, 200);
  });
});

describe("History and summary", () => {
  test("history is filterable and totals successful payments only", async () => {
    await pay(100, { method: "cash" });
    await pay(200, { method: "pos" });
    const reversed = (await pay(300, { method: "pos" })).body.transaction;
    await reverse(reversed._id);

    const all = await adminApi.get("/api/transactions");
    assert.equal(all.body.data.length, 3);
    assert.equal(all.body.totalAmount, 300);
    const pos = await adminApi.get("/api/transactions?method=pos");
    assert.equal(pos.body.data.length, 2);
    assert.equal(pos.body.totalAmount, 200);
    assert.equal((await adminApi.get(`/api/transactions?invoice=${invoice._id}`)).body.data.length, 3);
  });

  test("date range filter", async () => {
    await pay(100, { paidAt: "2026-01-15T10:00:00.000Z" });
    await pay(200, { paidAt: "2026-03-15T10:00:00.000Z" });
    const res = await adminApi.get("/api/transactions?from=2026-03-01&to=2026-03-31");
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.totalAmount, 200);
  });

  test("invalid id in a filter -> 400", async () => {
    assert.equal((await adminApi.get("/api/transactions?client=not-an-id")).status, 400);
  });

  test("summary: by method, by month, and outstanding balance", async () => {
    await pay(100, { method: "cash", paidAt: "2026-02-10T10:00:00.000Z" });
    await pay(300, { method: "bank_transfer", paidAt: "2026-03-10T10:00:00.000Z" });
    await createInvoice({ items: [{ description: "Install", quantity: 1, unitPrice: 5000 }] });

    const res = await adminApi.get("/api/transactions/summary");
    assert.equal(res.body.totalReceived, 400);
    assert.deepEqual(res.body.byMethod.map((m) => [m._id, m.amount]), [["bank_transfer", 300], ["cash", 100]]);
    assert.deepEqual(res.body.byMonth.map((m) => [m._id.month, m.amount]), [[3, 300], [2, 100]]);
    assert.deepEqual(res.body.outstanding, { _id: null, amount: 600 + 5000, count: 2 });
  });
});
