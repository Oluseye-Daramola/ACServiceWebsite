const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const Client = require("../Models/Client");
const { api, tokenFor, createAdmin, createTechnician, createClient, createService, createInvoice } = require("./helpers");

useTestDb();

let adminApi;
beforeEach(async () => {
  adminApi = api(tokenFor(await createAdmin()));
});

describe("Clients (admin)", () => {
  test("create a client (name and phone required)", async () => {
    const res = await adminApi.post("/api/clients").send({ name: "Chidi Nwosu", phone: "0803 555 1234", email: "Chidi@Gmail.com", city: "Lekki" });
    assert.equal(res.status, 201);
    assert.equal(res.body.client.email, "chidi@gmail.com", "email stored lowercase");

    const bad = await adminApi.post("/api/clients").send({ email: "x@gmail.com" });
    assert.equal(bad.status, 400);
    assert.deepEqual(bad.body.details.map((d) => d.field).sort(), ["name", "phone"]);
  });

  test("invalid phone -> 400", async () => {
    const res = await adminApi.post("/api/clients").send({ name: "Chidi", phone: "call me maybe" });
    assert.equal(res.status, 400);
  });

  test("list: newest first, paginated, searchable", async () => {
    await createClient({ name: "First Client", city: "Ikeja" });
    await createClient({ name: "Second Client", city: "Lekki" });
    await createClient({ name: "Third Client", city: "Lekki" });

    const page1 = await adminApi.get("/api/clients?limit=2&page=1");
    assert.deepEqual(page1.body.data.map((c) => c.name), ["Third Client", "Second Client"]);
    assert.deepEqual(page1.body.pagination, { page: 1, limit: 2, total: 3, pages: 2 });

    const lekki = await adminApi.get("/api/clients?search=lekki");
    assert.equal(lekki.body.data.length, 2);
  });

  test("search treats regex characters literally", async () => {
    await createClient({ name: "Plain Name" });
    const res = await adminApi.get(`/api/clients?search=${encodeURIComponent(".*")}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0);
  });

  test("get one client with their service and invoice history", async () => {
    const client = await createClient();
    const service = await createService({ client: client._id });
    await createInvoice({ service: service._id });
    const res = await adminApi.get(`/api/clients/${client._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.services.length, 1);
    assert.equal(res.body.invoices.length, 1);
  });

  test("unknown client -> 404", async () => {
    assert.equal((await adminApi.get("/api/clients/64b000000000000000000000")).status, 404);
  });

  test("update a client", async () => {
    const client = await createClient();
    const res = await adminApi.patch(`/api/clients/${client._id}`).send({ address: "New address", notes: "Gate code 1234" });
    assert.equal(res.status, 200);
    assert.equal(res.body.client.address, "New address");
  });

  test("delete: allowed with no history, blocked once they have services", async () => {
    const fresh = await createClient();
    assert.equal((await adminApi.delete(`/api/clients/${fresh._id}`)).status, 200);
    assert.equal(await Client.exists({ _id: fresh._id }), null);

    const busy = await createClient();
    await createService({ client: busy._id });
    const res = await adminApi.delete(`/api/clients/${busy._id}`);
    assert.equal(res.status, 400);
    assert.ok(await Client.exists({ _id: busy._id }));
  });

  test("technicians can't access clients -> 403", async () => {
    const tech = await createTechnician();
    assert.equal((await api(tokenFor(tech)).get("/api/clients")).status, 403);
  });
});
