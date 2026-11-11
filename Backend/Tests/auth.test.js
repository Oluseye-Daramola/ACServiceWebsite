const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { useTestDb } = require("./setup/db");
const { outbox } = require("./mocks/nodemailer");
const User = require("../Models/User");
const { api, tokenFor, createAdmin, createTechnician, PASSWORD } = require("./helpers");

useTestDb();

const login = (email, password, ip) => api(null, ip).post("/api/auth/login").send({ email, password });
const me = (token) => api(token).get("/api/auth/me");

describe("Login", () => {
  test("admin and technician log in with the same endpoint", async () => {
    const admin = await createAdmin();
    const tech = await createTechnician();
    for (const user of [admin, tech]) {
      const res = await login(user.email, PASSWORD);
      assert.equal(res.status, 200);
      assert.ok(res.body.token);
      assert.equal(res.body.user.role, user.role);
      assert.equal(res.body.user.password, undefined, "password hash must never be returned");
      assert.equal(res.body.user.tokenVersion, undefined);
    }
  });

  test("records lastLogin", async () => {
    const admin = await createAdmin();
    await login(admin.email, PASSWORD);
    assert.ok((await User.findById(admin._id)).lastLogin);
  });

  test("email is case-insensitive", async () => {
    const admin = await createAdmin({ email: "boss@test-ac.com" });
    assert.equal((await login("BOSS@Test-AC.com", PASSWORD)).status, 200, admin.email);
  });

  test("wrong password and unknown email give the same 401", async () => {
    const admin = await createAdmin();
    const wrong = await login(admin.email, "WrongPass1!");
    const unknown = await login("nobody@test-ac.com", PASSWORD);
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  test("deactivated account can't log in -> 403", async () => {
    const tech = await createTechnician({ isActive: false });
    const res = await login(tech.email, PASSWORD);
    assert.equal(res.status, 403);
  });

  test("deactivated account's existing token stops working -> 403", async () => {
    const tech = await createTechnician();
    const token = tokenFor(tech);
    await User.updateOne({ _id: tech._id }, { isActive: false });
    assert.equal((await me(token)).status, 403);
  });

  test("missing fields -> 400 with details", async () => {
    const res = await api().post("/api/auth/login").send({ email: "not-an-email" });
    assert.equal(res.status, 400);
    const fields = res.body.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ["email", "password"]);
  });

  test("brute-force protection: 11th attempt from one IP in 15 min -> 429", async () => {
    const admin = await createAdmin();
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await login(admin.email, "WrongPass1!", "203.0.113.7")).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.equal(statuses[10], 429);
  });

  test("expired token -> 401 with a clear message", async () => {
    const admin = await createAdmin();
    const expired = jwt.sign({ id: admin._id, role: "admin", tv: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await me(expired);
    assert.equal(res.status, 401);
    assert.match(res.body.message, /expired/i);
  });

  test("token signed with another secret -> 401", async () => {
    const admin = await createAdmin();
    const forged = jwt.sign({ id: admin._id, role: "admin", tv: 0 }, "attacker-secret");
    assert.equal((await me(forged)).status, 401);
  });
});

describe("My profile", () => {
  test("GET /me returns the logged-in user", async () => {
    const tech = await createTechnician();
    const res = await me(tokenFor(tech));
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, tech.email);
  });

  test("PATCH /me updates name and phone only", async () => {
    const tech = await createTechnician();
    const res = await api(tokenFor(tech)).patch("/api/auth/me").send({ name: "Tunde B.", phone: "08099998888", role: "admin" });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, "Tunde B.");
    assert.equal(res.body.user.role, "technician", "role can't be self-promoted");
  });

  test("PATCH /me with nothing to change -> 400", async () => {
    const tech = await createTechnician();
    assert.equal((await api(tokenFor(tech)).patch("/api/auth/me").send({})).status, 400);
  });
});

describe("Change password (logs out other devices)", () => {
  test("old tokens die, the returned token works, and the new password works", async () => {
    const admin = await createAdmin();
    const laptop = (await login(admin.email, PASSWORD)).body.token;
    const phone = tokenFor(admin);

    const res = await api(laptop).patch("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "NewPass2!" });
    assert.equal(res.status, 200);

    assert.equal((await me(phone)).status, 401, "other device logged out");
    assert.match((await me(phone)).body.message, /password was changed/i);
    assert.equal((await me(laptop)).status, 401, "the old token on this device is replaced too");
    assert.equal((await me(res.body.token)).status, 200);
    assert.equal((await login(admin.email, PASSWORD)).status, 401);
    assert.equal((await login(admin.email, "NewPass2!")).status, 200);
  });

  test("wrong current password -> 400", async () => {
    const admin = await createAdmin();
    const res = await api(tokenFor(admin)).patch("/api/auth/change-password").send({ currentPassword: "Nope1234!", newPassword: "NewPass2!" });
    assert.equal(res.status, 400);
  });

  test("new password must differ and be 8+ characters", async () => {
    const admin = await createAdmin();
    const t = tokenFor(admin);
    assert.equal((await api(t).patch("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: PASSWORD })).status, 400);
    assert.equal((await api(t).patch("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "short" })).status, 400);
  });

  test("tokens issued before token versions existed keep working until a password change", async () => {
    const admin = await createAdmin();
    const legacy = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    assert.equal((await me(legacy)).status, 200);
    await api(legacy).patch("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "NewPass2!" });
    assert.equal((await me(legacy)).status, 401);
  });

  test("profile edits and new logins don't log anyone out", async () => {
    const admin = await createAdmin();
    const t = tokenFor(admin);
    await api(t).patch("/api/auth/me").send({ name: "Renamed" });
    await login(admin.email, PASSWORD);
    assert.equal((await me(t)).status, 200);
  });
});

describe("Forgot / reset password", () => {
  const forgot = (email, ip) => api(null, ip).post("/api/auth/forgot-password").send({ email });
  const reset = (token, password, ip) => api(null, ip).post("/api/auth/reset-password").send({ token, password });
  const tokenFromEmail = (mail) => /reset-password\?token=([a-f0-9]{64})/.exec(mail.html)[1];

  test("full flow: email link -> reset -> logged in, other devices logged out", async () => {
    const admin = await createAdmin();
    const oldSession = tokenFor(admin);

    const res = await forgot(admin.email);
    assert.equal(res.status, 200);
    const mail = outbox.find((m) => m.to === admin.email);
    assert.ok(mail, "reset email sent");
    assert.match(mail.html, /http:\/\/localhost:5173\/reset-password\?token=/);

    const done = await reset(tokenFromEmail(mail), "NewPass2!");
    assert.equal(done.status, 200);
    assert.equal((await me(done.body.token)).status, 200);
    assert.equal((await me(oldSession)).status, 401);
    assert.equal((await login(admin.email, "NewPass2!")).status, 200);
  });

  test("same reply for unknown and deactivated accounts, and no email (no account probing)", async () => {
    const admin = await createAdmin();
    const gone = await createTechnician({ isActive: false });
    const real = await forgot(admin.email);
    const unknown = await forgot("nobody@test-ac.com");
    const inactive = await forgot(gone.email);
    assert.equal(unknown.body.message, real.body.message);
    assert.equal(inactive.body.message, real.body.message);
    assert.equal(outbox.messages.length, 1);
  });

  test("only a hash of the token is stored", async () => {
    const admin = await createAdmin();
    await forgot(admin.email);
    const stored = await User.findById(admin._id).select("+passwordResetToken");
    assert.ok(stored.passwordResetToken);
    assert.notEqual(stored.passwordResetToken, tokenFromEmail(outbox.messages[0]));
  });

  test("link is single-use", async () => {
    const admin = await createAdmin();
    await forgot(admin.email);
    const token = tokenFromEmail(outbox.messages[0]);
    assert.equal((await reset(token, "NewPass2!")).status, 200);
    assert.equal((await reset(token, "Another3!")).status, 400);
  });

  test("link expires after 30 minutes", async () => {
    const admin = await createAdmin();
    await forgot(admin.email);
    await User.updateOne({ _id: admin._id }, { passwordResetExpires: new Date(Date.now() - 1000) });
    const res = await reset(tokenFromEmail(outbox.messages[0]), "NewPass2!");
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Invalid or expired reset link");
  });

  test("a newer request cancels the older link", async () => {
    const admin = await createAdmin();
    await forgot(admin.email);
    await forgot(admin.email);
    const [first, second] = outbox.messages.map(tokenFromEmail);
    assert.equal((await reset(first, "NewPass2!")).status, 400);
    assert.equal((await reset(second, "NewPass2!")).status, 200);
  });

  test("a normal password change cancels an outstanding link", async () => {
    const admin = await createAdmin();
    await forgot(admin.email);
    await api(tokenFor(admin)).patch("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "NewPass2!" });
    assert.equal((await reset(tokenFromEmail(outbox.messages[0]), "Another3!")).status, 400);
  });

  test("malformed token and short password -> 400", async () => {
    const res = await reset("abc", "NewPass2!");
    assert.equal(res.status, 400);
    assert.equal(res.body.details.length, 1);
    assert.equal((await reset("a".repeat(64), "short")).status, 400);
  });

  test("SMTP failure doesn't break the request", async () => {
    const admin = await createAdmin();
    outbox.fail();
    const res = await forgot(admin.email);
    assert.equal(res.status, 200);
  });

  test("rate limits: 6th forgot request from one IP -> 429; reset has its own counter", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await forgot("nobody@test-ac.com", "198.51.100.9")).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
    assert.equal((await reset("b".repeat(64), "NewPass2!", "198.51.100.9")).status, 400);
  });
});
