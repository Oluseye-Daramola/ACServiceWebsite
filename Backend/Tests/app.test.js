const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { useTestDb } = require("./setup/db");
const { api, createAdmin, tokenFor } = require("./helpers");

useTestDb();

describe("App basics", () => {
  test("GET /api/health is public and OK", async () => {
    const res = await api().get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  test("unknown route -> 404 JSON", async () => {
    const res = await api().get("/api/does-not-exist");
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { success: false, message: "Route not found: GET /api/does-not-exist" });
  });

  test("protected route without a token -> 401", async () => {
    const res = await api().get("/api/clients");
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "No token provided");
  });

  test("garbage token -> 401", async () => {
    const res = await api("not.a.jwt").get("/api/clients");
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Invalid token");
  });

  test("malformed JSON body -> 400", async () => {
    const admin = await createAdmin();
    const res = await api(tokenFor(admin)).post("/api/clients").set("Content-Type", "application/json").send('{"name": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Malformed JSON body");
  });

  test("invalid id in the URL -> 400 validation error", async () => {
    const admin = await createAdmin();
    const res = await api(tokenFor(admin)).get("/api/clients/123");
    assert.equal(res.status, 400);
    assert.equal(res.body.details[0].field, "id");
  });

  test("CORS allows the configured frontend origin", async () => {
    const res = await api().get("/api/health").set("Origin", "http://localhost:5173");
    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
  });

  test("errors never include a stack trace outside development", async () => {
    const res = await api().get("/api/does-not-exist");
    assert.equal(res.body.stack, undefined);
  });
});
