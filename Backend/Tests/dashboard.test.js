const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const Enquiry = require("../Models/Enquiry");
const ServiceReport = require("../Models/ServiceReport");
const { api, tokenFor, createAdmin, createTechnician, createService, createAssignedService, createInvoice } = require("./helpers");

useTestDb();

describe("Dashboard", () => {
  test("admin: counts, revenue and work queues", async () => {
    const admin = await createAdmin();
    const adminApi = api(tokenFor(admin));
    const tech = await createTechnician();
    await createTechnician({ isActive: false });
    await Enquiry.create({ name: "New Lead", email: "lead@gmail.com", phone: "08030000000", message: "Need a repair" });
    await createService(); // pending, unassigned
    await createAssignedService(tech);

    const inv = await createInvoice({ items: [{ description: "Repair", quantity: 1, unitPrice: 1000 }] });
    await adminApi.post("/api/transactions").send({ invoiceId: String(inv._id), amount: 400, method: "cash" });
    await adminApi.post("/api/transactions").send({ invoiceId: String(inv._id), amount: 100, method: "cash", paidAt: "2020-01-01T00:00:00.000Z" });

    const res = await adminApi.get("/api/dashboard");
    assert.equal(res.status, 200);
    assert.equal(res.body.role, "admin");
    assert.equal(res.body.counts.activeTechnicians, 1);
    assert.deepEqual(res.body.counts.enquiries, { new: 1 });
    assert.equal(res.body.counts.services.pending, 2); // the invoice factory adds one more pending service
    assert.deepEqual(res.body.counts.invoices, { partially_paid: 1 });
    assert.deepEqual(res.body.revenue, { allTime: 500, thisMonth: 400, outstanding: 500 });
    assert.equal(res.body.recentEnquiries.length, 1);
    assert.equal(res.body.unassignedServices.length, 2);
  });

  test("technician: only their own jobs, upcoming schedule and unsigned reports", async () => {
    const tech = await createTechnician();
    const other = await createTechnician();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const job = await createAssignedService(tech, { scheduledDate: tomorrow });
    await createAssignedService(tech, { status: "completed" });
    await createAssignedService(other, { scheduledDate: tomorrow });
    await ServiceReport.create({ service: job._id, client: job.client, technician: tech._id, findings: "abc", workDone: "abc" });

    const res = await api(tokenFor(tech)).get("/api/dashboard");
    assert.equal(res.body.role, "technician");
    assert.deepEqual(res.body.jobs, { assigned: 1, completed: 1 });
    assert.deepEqual(res.body.upcoming.map((s) => s._id), [String(job._id)]);
    assert.equal(res.body.pendingSignatures, 1);
    assert.equal(res.body.revenue, undefined, "technicians don't see money");
  });
});
