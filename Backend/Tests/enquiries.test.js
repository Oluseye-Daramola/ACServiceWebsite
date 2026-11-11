const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const { outbox } = require("./mocks/nodemailer");
const Enquiry = require("../Models/Enquiry");
const Client = require("../Models/Client");
const { api, tokenFor, createAdmin, createTechnician, createClient } = require("./helpers");

useTestDb();

const enquiry = {
  name: "Chidi Nwosu",
  email: "chidi@gmail.com",
  phone: "0803 555 1234",
  address: "14 Admiralty Way, Lekki",
  serviceType: "gas_refill",
  preferredDate: "2026-11-12",
  message: "My 1.5HP split AC is blowing warm air."
};
const submit = (body = enquiry, ip) => api(null, ip).post("/api/enquiries").send(body);

let admin;
let adminApi;
beforeEach(async () => {
  admin = await createAdmin({ email: "owner@test-ac.com" });
  adminApi = api(tokenFor(admin));
});

describe("Public contact form", () => {
  test("anyone can submit an enquiry", async () => {
    const res = await submit();
    assert.equal(res.status, 201);
    assert.ok(res.body.enquiryId);
    const saved = await Enquiry.findById(res.body.enquiryId);
    assert.equal(saved.status, "new");
  });

  test("validation: name, email, phone and message are required", async () => {
    const res = await submit({ serviceType: "repair" });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.details.map((d) => d.field).sort(), ["email", "message", "name", "phone"]);
  });

  test("unknown service type -> 400", async () => {
    assert.equal((await submit({ ...enquiry, serviceType: "car_wash" })).status, 400);
  });

  test("spam protection: 6th enquiry from one IP within an hour -> 429", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await submit(enquiry, "192.0.2.50")).status);
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
  });
});

describe("Enquiry emails", () => {
  test("customer gets an acknowledgement", async () => {
    await submit();
    const ack = await outbox.waitFor((m) => m.to === "chidi@gmail.com");
    assert.ok(ack);
    assert.match(ack.subject, /We received your enquiry/);
  });

  test("active admins get an alert they can reply to", async () => {
    await createAdmin({ email: "second@test-ac.com" });
    await createAdmin({ email: "former@test-ac.com", isActive: false });
    await createTechnician({ email: "tech@test-ac.com" });

    await submit();
    // Match this test's alert specifically: background emails from the previous test can still land
    const alert = await outbox.waitFor((m) => /^New enquiry/.test(m.subject) && m.to.length === 2);
    assert.ok(alert);
    assert.deepEqual([...alert.to].sort(), ["owner@test-ac.com", "second@test-ac.com"]);
    assert.equal(alert.replyTo, "chidi@gmail.com");
    assert.equal(alert.subject, "New enquiry: Gas Refill - Chidi Nwosu");
    for (const text of ["0803 555 1234", "14 Admiralty Way", "Thu, 12 Nov 2026", "blowing warm air"]) {
      assert.ok(alert.html.includes(text), `alert contains ${text}`);
    }
  });

  test("hostile input is escaped and can't inject email headers", async () => {
    await submit({ ...enquiry, name: "Evil\r\nBcc: victim@x.com", message: "<script>alert(1)</script>" });
    const alert = await outbox.waitFor((m) => /^New enquiry: .* - Evil/.test(m.subject));
    assert.ok(alert);
    assert.doesNotMatch(alert.subject, /[\r\n]/);
    assert.ok(!alert.html.includes("<script>"));
    assert.ok(alert.html.includes("&#60;script&#62;"));
  });

  test("a slow mail server doesn't slow down the form", async () => {
    outbox.slow();
    const started = Date.now();
    const res = await submit();
    assert.equal(res.status, 201);
    assert.ok(Date.now() - started < 1500, `took ${Date.now() - started}ms`);
  });

  test("a broken mail server doesn't break the form", async () => {
    outbox.fail();
    const res = await submit();
    assert.equal(res.status, 201);
    assert.equal(await Enquiry.countDocuments(), 1);
  });
});

describe("Managing enquiries (admin)", () => {
  test("list with status filter and search", async () => {
    await Enquiry.create([
      { ...enquiry, name: "New One" },
      { ...enquiry, name: "Contacted One", status: "contacted" }
    ]);
    const all = await adminApi.get("/api/enquiries");
    assert.equal(all.body.data.length, 2);
    const contacted = await adminApi.get("/api/enquiries?status=contacted");
    assert.deepEqual(contacted.body.data.map((e) => e.name), ["Contacted One"]);
    const search = await adminApi.get("/api/enquiries?search=new%20one");
    assert.equal(search.body.data.length, 1);
  });

  test("update status and notes; 'converted' can't be set by hand", async () => {
    const e = await Enquiry.create(enquiry);
    const res = await adminApi.patch(`/api/enquiries/${e._id}/status`).send({ status: "contacted", adminNotes: "Called, visiting Thursday" });
    assert.equal(res.status, 200);
    assert.equal(res.body.enquiry.status, "contacted");
    assert.equal((await adminApi.patch(`/api/enquiries/${e._id}/status`).send({ status: "converted" })).status, 400);
  });

  test("technicians can't see enquiries -> 403", async () => {
    const tech = await createTechnician();
    assert.equal((await api(tokenFor(tech)).get("/api/enquiries")).status, 403);
  });

  test("delete a non-converted enquiry", async () => {
    const e = await Enquiry.create(enquiry);
    assert.equal((await adminApi.delete(`/api/enquiries/${e._id}`)).status, 200);
    assert.equal(await Enquiry.countDocuments(), 0);
  });
});

describe("Converting an enquiry into a job", () => {
  test("creates a new client and a pending service from the enquiry details", async () => {
    const e = await Enquiry.create(enquiry);
    const res = await adminApi.post(`/api/enquiries/${e._id}/convert`).send({});
    assert.equal(res.status, 201);
    assert.equal(res.body.clientCreated, true);
    assert.equal(res.body.client.email, "chidi@gmail.com");

    const s = res.body.service;
    assert.match(s.serviceNo, /^SRV-\d{4}-00001$/);
    assert.equal(s.status, "pending");
    assert.equal(s.serviceType, "gas_refill");
    assert.equal(s.title, "gas refill for Chidi Nwosu");
    assert.equal(s.description, enquiry.message);
    assert.equal(s.address, enquiry.address);
    assert.equal(new Date(s.scheduledDate).toISOString().slice(0, 10), "2026-11-12");

    assert.equal(res.body.enquiry.status, "converted");
    assert.equal(res.body.enquiry.service, s._id);
  });

  test("reuses an existing client with the same email or phone", async () => {
    const existing = await createClient({ name: "Chidi N.", email: "chidi@gmail.com" });
    const e = await Enquiry.create(enquiry);
    const res = await adminApi.post(`/api/enquiries/${e._id}/convert`).send({});
    assert.equal(res.body.clientCreated, false);
    assert.equal(res.body.client._id, String(existing._id));
    assert.equal(await Client.countDocuments(), 1);
  });

  test("can override fields and assign a technician straight away (technician is emailed)", async () => {
    const tech = await createTechnician({ email: "tunde@test-ac.com" });
    const e = await Enquiry.create(enquiry);
    const res = await adminApi.post(`/api/enquiries/${e._id}/convert`).send({
      technicianId: String(tech._id), title: "Gas top-up, 1.5HP split", priority: "high"
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.service.status, "assigned");
    assert.equal(res.body.service.title, "Gas top-up, 1.5HP split");
    assert.equal(res.body.service.priority, "high");
    const mail = await outbox.waitFor((m) => m.to === "tunde@test-ac.com");
    assert.match(mail.subject, /New job assigned: SRV-/);
  });

  test("converting twice, editing or deleting a converted enquiry -> 400", async () => {
    const e = await Enquiry.create(enquiry);
    await adminApi.post(`/api/enquiries/${e._id}/convert`).send({});
    assert.equal((await adminApi.post(`/api/enquiries/${e._id}/convert`).send({})).status, 400);
    assert.equal((await adminApi.patch(`/api/enquiries/${e._id}/status`).send({ status: "closed" })).status, 400);
    assert.equal((await adminApi.delete(`/api/enquiries/${e._id}`)).status, 400);
  });

  test("a deactivated technician can't be assigned during conversion", async () => {
    const tech = await createTechnician({ isActive: false });
    const e = await Enquiry.create(enquiry);
    const res = await adminApi.post(`/api/enquiries/${e._id}/convert`).send({ technicianId: String(tech._id) });
    assert.equal(res.status, 400);
    assert.equal((await Enquiry.findById(e._id)).status, "new", "nothing converted");
  });
});
