const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const { outbox } = require("./mocks/nodemailer");
const Service = require("../Models/Service");
const ServiceReport = require("../Models/ServiceReport");
const {
  api, tokenFor, createAdmin, createTechnician, createClient, createService, createAssignedService, createInvoice
} = require("./helpers");

useTestDb();

let adminApi;
let tech;
let techApi;
beforeEach(async () => {
  adminApi = api(tokenFor(await createAdmin()));
  tech = await createTechnician({ email: "tunde@test-ac.com" });
  techApi = api(tokenFor(tech));
});

const fullySignedReport = (service) =>
  ServiceReport.create({
    service: service._id, client: service.client, technician: service.technician,
    findings: "Low gas", workDone: "Refilled gas",
    technicianSignature: { name: "Tunde", imageUrl: "http://x/sig1.png" },
    clientSignature: { name: "Client", imageUrl: "http://x/sig2.png" }
  });

describe("Creating and managing services (admin)", () => {
  test("create a service; address defaults to the client's; numbers are sequential", async () => {
    const client = await createClient({ address: "5 Bourdillon Road" });
    const body = {
      clientId: String(client._id), title: "Install 2 split units", serviceType: "installation",
      acUnits: [{ brand: "LG", capacity: "1.5HP", location: "Bedroom" }]
    };
    const first = await adminApi.post("/api/services").send(body);
    const second = await adminApi.post("/api/services").send(body);
    assert.equal(first.status, 201);
    assert.equal(first.body.service.address, "5 Bourdillon Road");
    assert.equal(first.body.service.status, "pending");
    assert.equal(first.body.service.client.name, client.name, "client populated");
    assert.match(first.body.service.serviceNo, /^SRV-\d{4}-00001$/);
    assert.match(second.body.service.serviceNo, /^SRV-\d{4}-00002$/);
  });

  test("create with a technician -> assigned and technician emailed", async () => {
    const client = await createClient();
    const res = await adminApi.post("/api/services").send({
      clientId: String(client._id), title: "Repair", serviceType: "repair", technicianId: String(tech._id)
    });
    assert.equal(res.body.service.status, "assigned");
    assert.ok(await outbox.waitFor((m) => m.to === "tunde@test-ac.com"));
  });

  test("unknown client -> 404; bad service type -> 400", async () => {
    const r1 = await adminApi.post("/api/services").send({ clientId: "64b000000000000000000000", title: "Repair", serviceType: "repair" });
    assert.equal(r1.status, 404);
    const client = await createClient();
    const r2 = await adminApi.post("/api/services").send({ clientId: String(client._id), title: "Repair", serviceType: "magic" });
    assert.equal(r2.status, 400);
  });

  test("assign / reassign a technician", async () => {
    const service = await createService();
    const res = await adminApi.patch(`/api/services/${service._id}/assign`).send({ technicianId: String(tech._id) });
    assert.equal(res.status, 200);
    assert.equal(res.body.service.status, "assigned");
    assert.equal(res.body.service.technician.email, "tunde@test-ac.com");
  });

  test("can't assign a deactivated technician, or assign to a completed/cancelled job", async () => {
    const inactive = await createTechnician({ isActive: false });
    const service = await createService();
    assert.equal((await adminApi.patch(`/api/services/${service._id}/assign`).send({ technicianId: String(inactive._id) })).status, 400);
    const done = await createService({ status: "completed" });
    assert.equal((await adminApi.patch(`/api/services/${done._id}/assign`).send({ technicianId: String(tech._id) })).status, 400);
  });

  test("list filters by status and type", async () => {
    await createService({ serviceType: "repair" });
    await createService({ serviceType: "installation", status: "cancelled" });
    assert.equal((await adminApi.get("/api/services?status=cancelled")).body.data.length, 1);
    assert.equal((await adminApi.get("/api/services?serviceType=repair")).body.data.length, 1);
  });

  test("admin sees the service with its report and invoice", async () => {
    const service = await createAssignedService(tech);
    await createInvoice({ service: service._id });
    const res = await adminApi.get(`/api/services/${service._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.report, null);
    assert.ok(res.body.invoice);
  });

  test("update a service", async () => {
    const service = await createService();
    const res = await adminApi.patch(`/api/services/${service._id}`).send({ priority: "urgent", scheduledDate: "2026-12-01" });
    assert.equal(res.status, 200);
    assert.equal(res.body.service.priority, "urgent");
  });

  test("delete: allowed when clean, blocked once there is an invoice or report", async () => {
    const clean = await createService();
    assert.equal((await adminApi.delete(`/api/services/${clean._id}`)).status, 200);

    const invoiced = await createService();
    await createInvoice({ service: invoiced._id });
    assert.equal((await adminApi.delete(`/api/services/${invoiced._id}`)).status, 400);

    const reported = await createAssignedService(tech);
    await ServiceReport.create({ service: reported._id, client: reported.client, technician: tech._id, findings: "abc", workDone: "abc" });
    assert.equal((await adminApi.delete(`/api/services/${reported._id}`)).status, 400);
  });
});

describe("Admin status override", () => {
  test("admin can cancel and reopen", async () => {
    const service = await createAssignedService(tech);
    assert.equal((await adminApi.patch(`/api/services/${service._id}/status`).send({ status: "cancelled" })).body.service.status, "cancelled");
    assert.equal((await adminApi.patch(`/api/services/${service._id}/status`).send({ status: "assigned" })).body.service.status, "assigned");
  });

  test("admin can mark completed WITHOUT a signed report (intentional override)", async () => {
    const service = await createAssignedService(tech);
    const res = await adminApi.patch(`/api/services/${service._id}/status`).send({ status: "completed" });
    assert.equal(res.status, 200);
    assert.equal(res.body.service.status, "completed");
    assert.ok(res.body.service.completedAt);
  });

  test("assigned / in progress / completed need a technician first", async () => {
    const service = await createService();
    const res = await adminApi.patch(`/api/services/${service._id}/status`).send({ status: "in_progress" });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Assign a technician first/);
  });

  test("technicians can't use the admin endpoints -> 403", async () => {
    const service = await createAssignedService(tech);
    assert.equal((await techApi.patch(`/api/services/${service._id}/status`).send({ status: "completed" })).status, 403);
    assert.equal((await techApi.post("/api/services").send({})).status, 403);
  });
});

describe("Technician job workflow", () => {
  test("technicians only see their own jobs", async () => {
    const other = await createTechnician();
    const mine = await createAssignedService(tech);
    const theirs = await createAssignedService(other);
    const list = await techApi.get("/api/services");
    assert.deepEqual(list.body.data.map((s) => s._id), [String(mine._id)]);
    assert.equal((await techApi.get(`/api/services?technician=${other._id}`)).body.data.length, 1, "can't widen via query");
    assert.equal((await techApi.get(`/api/services/${theirs._id}`)).status, 404);
    const own = await techApi.get(`/api/services/${mine._id}`);
    assert.equal(own.status, 200);
    assert.equal(own.body.invoice, undefined, "technicians don't see invoices");
  });

  test("start: only an assigned job can be started", async () => {
    const service = await createAssignedService(tech);
    const res = await techApi.patch(`/api/services/${service._id}/progress`).send({ status: "in_progress", technicianNotes: "On my way" });
    assert.equal(res.status, 200);
    assert.equal(res.body.service.status, "in_progress");
    assert.ok(res.body.service.startedAt);
    assert.equal((await techApi.patch(`/api/services/${service._id}/progress`).send({ status: "in_progress" })).status, 400);
  });

  test("complete: needs the job started and a report signed by both parties", async () => {
    const service = await createAssignedService(tech);
    const complete = () => techApi.patch(`/api/services/${service._id}/progress`).send({ status: "completed" });

    assert.match((await complete()).body.message, /Start the service/);
    await Service.updateOne({ _id: service._id }, { status: "in_progress" });
    assert.match((await complete()).body.message, /Submit a service report/);

    const report = await ServiceReport.create({
      service: service._id, client: service.client, technician: tech._id, findings: "abc", workDone: "abc",
      technicianSignature: { name: "Tunde", imageUrl: "http://x/s.png" }
    });
    assert.match((await complete()).body.message, /signed by both/);

    await report.deleteOne();
    await fullySignedReport(await Service.findById(service._id));
    const res = await complete();
    assert.equal(res.status, 200);
    assert.equal(res.body.service.status, "completed");
    assert.ok(res.body.service.completedAt);
  });

  test("can't progress someone else's job -> 404", async () => {
    const other = await createTechnician();
    const theirs = await createAssignedService(other);
    assert.equal((await techApi.patch(`/api/services/${theirs._id}/progress`).send({ status: "in_progress" })).status, 404);
  });
});
