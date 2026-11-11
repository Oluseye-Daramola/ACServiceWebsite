const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const User = require("../Models/User");
const { api, tokenFor, createAdmin, createTechnician, createAssignedService, PASSWORD } = require("./helpers");

useTestDb();

let admin;
let adminApi;
beforeEach(async () => {
  admin = await createAdmin();
  adminApi = api(tokenFor(admin));
});

describe("Technician accounts (admin)", () => {
  test("create a technician", async () => {
    const res = await api(tokenFor(admin)).post("/api/technicians").send({
      name: "Musa Ibrahim", email: "musa@test-ac.com", phone: "08030001111", password: "TechPass1!", specialization: "VRF", role: "admin"
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.technician.role, "technician", "role in the body is ignored");
    assert.equal(res.body.technician.password, undefined);
    const login = await api().post("/api/auth/login").send({ email: "musa@test-ac.com", password: "TechPass1!" });
    assert.equal(login.status, 200, "new technician can log in");
  });

  test("duplicate email -> 409", async () => {
    const tech = await createTechnician();
    const res = await adminApi.post("/api/technicians").send({ name: "Copy", email: tech.email, phone: "08030001111", password: "TechPass1!" });
    assert.equal(res.status, 409);
  });

  test("validation: missing phone, short password", async () => {
    const res = await adminApi.post("/api/technicians").send({ name: "X Y", email: "x@test-ac.com", password: "short" });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.details.map((d) => d.field).sort(), ["password", "phone"]);
  });

  test("list with search and isActive filter (technicians only, no admins)", async () => {
    await createTechnician({ name: "Alice Active" });
    await createTechnician({ name: "Ian Inactive", isActive: false });
    const all = await adminApi.get("/api/technicians");
    assert.equal(all.body.data.length, 2);
    assert.ok(all.body.data.every((u) => u.role === "technician"));
    assert.equal(all.body.pagination.total, 2);

    const active = await adminApi.get("/api/technicians?isActive=true");
    assert.deepEqual(active.body.data.map((t) => t.name), ["Alice Active"]);
    const search = await adminApi.get("/api/technicians?search=ian");
    assert.deepEqual(search.body.data.map((t) => t.name), ["Ian Inactive"]);
  });

  test("get one technician with job counts", async () => {
    const tech = await createTechnician();
    await createAssignedService(tech);
    await createAssignedService(tech, { status: "completed" });
    const res = await adminApi.get(`/api/technicians/${tech._id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.jobs, { assigned: 1, completed: 1 });
  });

  test("an admin id is not a technician -> 404", async () => {
    assert.equal((await adminApi.get(`/api/technicians/${admin._id}`)).status, 404);
  });

  test("update details; email taken by someone else -> 409", async () => {
    const tech = await createTechnician();
    const res = await adminApi.patch(`/api/technicians/${tech._id}`).send({ specialization: "Cassette units" });
    assert.equal(res.status, 200);
    assert.equal(res.body.technician.specialization, "Cassette units");
    assert.equal((await adminApi.patch(`/api/technicians/${tech._id}`).send({ email: admin.email })).status, 409);
  });

  test("reset password: old password stops working and the technician is logged out", async () => {
    const tech = await createTechnician();
    const techToken = tokenFor(tech);
    const res = await adminApi.patch(`/api/technicians/${tech._id}/reset-password`).send({ password: "ResetPass1!" });
    assert.equal(res.status, 200);
    assert.equal((await api(techToken).get("/api/auth/me")).status, 401);
    assert.equal((await api().post("/api/auth/login").send({ email: tech.email, password: PASSWORD })).status, 401);
    assert.equal((await api().post("/api/auth/login").send({ email: tech.email, password: "ResetPass1!" })).status, 200);
  });

  test("technicians can't manage technician accounts -> 403", async () => {
    const tech = await createTechnician();
    assert.equal((await api(tokenFor(tech)).get("/api/technicians")).status, 403);
  });
});

describe("Deactivating a technician", () => {
  test("DELETE is blocked while they have active jobs", async () => {
    const tech = await createTechnician();
    await createAssignedService(tech, { status: "in_progress" });
    const res = await adminApi.delete(`/api/technicians/${tech._id}`);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Reassign this technician's 1 active job/);
  });

  test("PATCH isActive:false is blocked the same way", async () => {
    const tech = await createTechnician();
    await createAssignedService(tech);
    const res = await adminApi.patch(`/api/technicians/${tech._id}`).send({ isActive: false });
    assert.equal(res.status, 400);
    assert.equal((await User.findById(tech._id)).isActive, true);
  });

  test("other edits still work while they have active jobs", async () => {
    const tech = await createTechnician();
    await createAssignedService(tech);
    assert.equal((await adminApi.patch(`/api/technicians/${tech._id}`).send({ name: "New Name" })).status, 200);
  });

  test("with no active jobs: deactivates (soft delete) and keeps the record", async () => {
    const tech = await createTechnician();
    await createAssignedService(tech, { status: "completed" });
    const res = await adminApi.delete(`/api/technicians/${tech._id}`);
    assert.equal(res.status, 200);
    const stored = await User.findById(tech._id);
    assert.ok(stored, "record kept for job history");
    assert.equal(stored.isActive, false);
  });

  test("reactivating is always allowed", async () => {
    const tech = await createTechnician({ isActive: false });
    await createAssignedService(tech);
    const res = await adminApi.patch(`/api/technicians/${tech._id}`).send({ isActive: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.technician.isActive, true);
  });
});
