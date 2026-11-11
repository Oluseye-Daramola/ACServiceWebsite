const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { useTestDb } = require("./setup/db");
const { outbox } = require("./mocks/nodemailer");
const Invoice = require("../Models/Invoice");
const { api, tokenFor, createAdmin, createTechnician, createClient, createService, createInvoice, binary } = require("./helpers");

useTestDb();

let admin;
let adminApi;
let client;
let service;
beforeEach(async () => {
  admin = await createAdmin();
  adminApi = api(tokenFor(admin));
  client = await createClient({ name: "Adaeze Okafor", email: "adaeze@gmail.com", phone: "0803 555 6666" });
  service = await createService({ client: client._id, status: "completed" });
});

const items = [
  { description: "Gas refill (R410A)", quantity: 2, unitPrice: 1500 },
  { description: "Flare nut", quantity: 1, unitPrice: 500 }
];
const pay = (invoiceId, amount) => adminApi.post("/api/transactions").send({ invoiceId: String(invoiceId), amount, method: "cash" });
const pdfOf = (agent, url) => agent.get(url).buffer(true).parse(binary);

describe("Creating invoices", () => {
  test("totals are calculated: line amounts, discount, then tax", async () => {
    const res = await adminApi.post("/api/invoices").send({ serviceId: String(service._id), items, discount: 500, taxRate: 7.5 });
    assert.equal(res.status, 201);
    const inv = res.body.invoice;
    assert.match(inv.invoiceNo, /^INV-\d{4}-00001$/);
    assert.deepEqual(inv.items.map((i) => i.amount), [3000, 500]);
    assert.equal(inv.subtotal, 3500);
    assert.equal(inv.taxAmount, 225); // 7.5% of (3500 - 500)
    assert.equal(inv.total, 3225);
    assert.equal(inv.balance, 3225);
    assert.equal(inv.status, "unpaid");
    assert.equal(inv.client.name, "Adaeze Okafor", "client comes from the service");
  });

  test("totals ignore any values sent by the client", async () => {
    const res = await adminApi.post("/api/invoices").send({ serviceId: String(service._id), items, total: 1, amountPaid: 999999, status: "paid" });
    assert.equal(res.body.invoice.total, 3500);
    assert.equal(res.body.invoice.amountPaid, 0);
    assert.equal(res.body.invoice.status, "unpaid");
  });

  test("one active invoice per service -> 409; allowed again after cancelling", async () => {
    const first = await adminApi.post("/api/invoices").send({ serviceId: String(service._id), items });
    assert.equal((await adminApi.post("/api/invoices").send({ serviceId: String(service._id), items })).status, 409);
    await adminApi.patch(`/api/invoices/${first.body.invoice._id}/cancel`);
    assert.equal((await adminApi.post("/api/invoices").send({ serviceId: String(service._id), items })).status, 201);
  });

  test("can't invoice a cancelled service", async () => {
    const cancelled = await createService({ status: "cancelled" });
    assert.equal((await adminApi.post("/api/invoices").send({ serviceId: String(cancelled._id), items })).status, 400);
  });

  test("validation: at least one item, positive quantity, tax 0-100", async () => {
    const id = String(service._id);
    assert.equal((await adminApi.post("/api/invoices").send({ serviceId: id, items: [] })).status, 400);
    assert.equal((await adminApi.post("/api/invoices").send({ serviceId: id, items: [{ description: "X item", quantity: 0, unitPrice: 5 }] })).status, 400);
    assert.equal((await adminApi.post("/api/invoices").send({ serviceId: id, items, taxRate: 150 })).status, 400);
  });

  test("technicians can't access invoices -> 403", async () => {
    const tech = await createTechnician();
    assert.equal((await api(tokenFor(tech)).get("/api/invoices")).status, 403);
  });
});

describe("Listing, editing, cancelling", () => {
  test("list filters by status and searches invoice numbers", async () => {
    const a = await createInvoice();
    await createInvoice();
    await pay(a._id, 1000);
    assert.equal((await adminApi.get("/api/invoices?status=paid")).body.data.length, 1);
    assert.equal((await adminApi.get("/api/invoices?status=unpaid")).body.data.length, 1);
    assert.equal((await adminApi.get(`/api/invoices?search=${a.invoiceNo}`)).body.data.length, 1);
  });

  test("get one invoice with its payment history", async () => {
    const inv = await createInvoice();
    await pay(inv._id, 400);
    const res = await adminApi.get(`/api/invoices/${inv._id}`);
    assert.equal(res.body.transactions.length, 1);
    assert.equal(res.body.invoice.status, "partially_paid");
  });

  test("edit before any payment recalculates totals", async () => {
    const inv = await createInvoice();
    const res = await adminApi.patch(`/api/invoices/${inv._id}`).send({ items: [{ description: "New price", quantity: 3, unitPrice: 700 }] });
    assert.equal(res.status, 200);
    assert.equal(res.body.invoice.total, 2100);
  });

  test("no edits once a payment exists, or after cancelling", async () => {
    const paid = await createInvoice();
    await pay(paid._id, 100);
    assert.equal((await adminApi.patch(`/api/invoices/${paid._id}`).send({ notes: "x" })).status, 400);

    const cancelled = await createInvoice();
    await adminApi.patch(`/api/invoices/${cancelled._id}/cancel`);
    assert.equal((await adminApi.patch(`/api/invoices/${cancelled._id}`).send({ notes: "x" })).status, 400);
  });

  test("cancel: blocked while payments exist", async () => {
    const inv = await createInvoice();
    await pay(inv._id, 100);
    const res = await adminApi.patch(`/api/invoices/${inv._id}/cancel`);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Reverse the payments/);
  });
});

describe("Invoice PDF, email and WhatsApp", () => {
  test("admin downloads the PDF", async () => {
    const inv = await createInvoice();
    const res = await pdfOf(adminApi, `/api/invoices/${inv._id}/pdf`);
    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "application/pdf");
    assert.equal(res.headers["content-disposition"], `attachment; filename="${inv.invoiceNo}.pdf"`);
    assert.equal(res.body.subarray(0, 5).toString(), "%PDF-");
  });

  test("email sends the PDF to the client and is logged", async () => {
    const inv = await createInvoice({ service: service._id });
    const res = await adminApi.post(`/api/invoices/${inv._id}/send-email`).send({});
    assert.equal(res.status, 200);
    const mail = outbox.find((m) => m.to === "adaeze@gmail.com");
    assert.equal(mail.attachments[0].filename, `${inv.invoiceNo}.pdf`);
    const stored = await Invoice.findById(inv._id);
    assert.equal(stored.sentLog[0].channel, "email");
  });

  test("SMTP down -> clear 502 without mail-server details, and nothing logged as sent", async () => {
    const inv = await createInvoice({ service: service._id });
    outbox.fail();
    const res = await adminApi.post(`/api/invoices/${inv._id}/send-email`).send({});
    assert.equal(res.status, 502);
    assert.equal(res.body.message, "We couldn't send the email right now. Please try again in a few minutes.");
    assert.doesNotMatch(JSON.stringify(res.body), /SMTP|refused/i);
    assert.equal((await Invoice.findById(inv._id)).sentLog.length, 0);
  });

  test("email not configured on the server -> 503 telling the admin what's missing", async () => {
    const { smtp } = require("../Config/env");
    const saved = smtp.host;
    smtp.host = "";
    try {
      const inv = await createInvoice({ service: service._id });
      const res = await adminApi.post(`/api/invoices/${inv._id}/send-email`).send({});
      assert.equal(res.status, 503);
      assert.match(res.body.message, /Email is not configured/);
    } finally {
      smtp.host = saved;
    }
  });

  test("WhatsApp: returns a wa.me link in international format with a public PDF link", async () => {
    const inv = await createInvoice({ service: service._id });
    const res = await adminApi.post(`/api/invoices/${inv._id}/share-whatsapp`).send({});
    assert.equal(res.status, 200);
    assert.ok(res.body.whatsappUrl.startsWith("https://wa.me/2348035556666?text="));
    const text = decodeURIComponent(res.body.whatsappUrl.split("?text=")[1]);
    assert.match(text, new RegExp(inv.invoiceNo));
    assert.ok(text.includes(res.body.pdfLink));
    assert.equal((await Invoice.findById(inv._id)).sentLog[0].channel, "whatsapp");
  });

  test("the public PDF link works without logging in", async () => {
    const inv = await createInvoice({ service: service._id });
    const { pdfLink } = (await adminApi.post(`/api/invoices/${inv._id}/share-whatsapp`).send({})).body;
    const res = await pdfOf(api(), new URL(pdfLink).pathname + new URL(pdfLink).search);
    assert.equal(res.status, 200);
    assert.match(res.headers["content-disposition"], /^inline;/);
  });

  test("public link can't be reused for another invoice, faked, or replaced by a login token", async () => {
    const a = await createInvoice({ service: service._id });
    const b = await createInvoice();
    const { pdfLink } = (await adminApi.post(`/api/invoices/${a._id}/share-whatsapp`).send({})).body;
    const token = new URL(pdfLink).searchParams.get("token");

    assert.equal((await api().get(`/api/invoices/public/${b._id}/pdf?token=${token}`)).status, 401);
    assert.equal((await api().get(`/api/invoices/public/${a._id}/pdf`)).status, 401);
    const forged = jwt.sign({ purpose: "invoice-pdf", invoiceId: String(a._id) }, "wrong-secret");
    assert.equal((await api().get(`/api/invoices/public/${a._id}/pdf?token=${forged}`)).status, 401);
    assert.equal((await api().get(`/api/invoices/public/${a._id}/pdf?token=${tokenFor(admin)}`)).status, 401);
  });

  test("the public PDF token can't be used to log in to the API", async () => {
    const inv = await createInvoice({ service: service._id });
    const { pdfLink } = (await adminApi.post(`/api/invoices/${inv._id}/share-whatsapp`).send({})).body;
    const token = new URL(pdfLink).searchParams.get("token");
    assert.equal((await api(token).get("/api/invoices")).status, 401);
  });

  test("cancelled invoices can't be sent", async () => {
    const inv = await createInvoice({ service: service._id });
    await adminApi.patch(`/api/invoices/${inv._id}/cancel`);
    assert.equal((await adminApi.post(`/api/invoices/${inv._id}/send-email`).send({})).status, 400);
    assert.equal((await adminApi.post(`/api/invoices/${inv._id}/share-whatsapp`).send({})).status, 400);
  });
});
