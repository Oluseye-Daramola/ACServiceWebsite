// Shared helpers for the test suite: an API client, data factories and test images.
const zlib = require("zlib");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../app");
const User = require("../Models/User");
const Client = require("../Models/Client");
const Service = require("../Models/Service");
const Invoice = require("../Models/Invoice");
const { nextSequence } = require("../Utils/generateInvoiceNo");

const PASSWORD = "Password1!";

// ---------- API client ----------
// Every request gets its own fake client IP (app trusts X-Forwarded-For), so the
// rate limiters don't interfere unless a test pins an IP on purpose.
let ipCounter = 0;
const nextIp = () => {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
};

/**
 * api(token?, ip?) -> supertest agent with .get/.post/.patch/.delete
 *   await api(adminToken).post("/api/clients").send({...})
 */
const api = (token, ip) => {
  const wrap = (method) => (url) => {
    const req = request(app)[method](url).set("X-Forwarded-For", ip || nextIp());
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };
  return { get: wrap("get"), post: wrap("post"), patch: wrap("patch"), delete: wrap("delete") };
};

const tokenFor = (user) =>
  jwt.sign({ id: user._id, role: user.role, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });

// ---------- Factories ----------
let n = 0;
const uid = () => `${Date.now().toString(36)}${(n += 1)}`;

const createAdmin = (overrides = {}) =>
  User.create({ name: "Admin User", email: `admin-${uid()}@test-ac.com`, password: PASSWORD, role: "admin", ...overrides });

const createTechnician = (overrides = {}) =>
  User.create({
    name: "Tunde Bakare",
    email: `tech-${uid()}@test-ac.com`,
    phone: "08031112222",
    password: PASSWORD,
    role: "technician",
    ...overrides
  });

const createClient = (overrides = {}) =>
  Client.create({
    name: "Adaeze Okafor",
    email: `client-${uid()}@gmail.com`,
    phone: "08035556666",
    address: "5 Bourdillon Road, Ikoyi",
    ...overrides
  });

const createService = async (overrides = {}) => {
  const client = overrides.client || (await createClient())._id;
  return Service.create({
    serviceNo: await nextSequence("service", "SRV"),
    title: "Split unit not cooling",
    serviceType: "repair",
    address: "5 Bourdillon Road, Ikoyi",
    ...overrides,
    client
  });
};

/** A service assigned to a technician (default status: assigned) */
const createAssignedService = async (technician, overrides = {}) =>
  createService({ technician: technician._id, status: "assigned", assignedAt: new Date(), ...overrides });

const createInvoice = async ({ items = [{ description: "AC repair", quantity: 1, unitPrice: 1000 }], ...overrides } = {}) => {
  const service = overrides.service ? await Service.findById(overrides.service) : await createService();
  return Invoice.create({
    invoiceNo: await nextSequence("invoice", "INV"),
    items,
    ...overrides,
    service: service._id,
    client: service.client
  });
};

// ---------- Images ----------
// Minimal PNG encoder. px(x, y) -> [r, g, b]
const png = (w, h, px) => {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      [raw[o], raw[o + 1], raw[o + 2]] = px(x, y);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
};

const photoPng = () => png(64, 48, (x, y) => [(x * 4) % 255, (y * 5) % 255, 128]);
const signaturePng = () => png(120, 40, (x, y) => (Math.abs(y - (20 + 10 * Math.sin(x / 8))) < 2 ? [20, 30, 120] : [255, 255, 255]));
const signatureDataUrl = () => `data:image/png;base64,${signaturePng().toString("base64")}`;

// supertest: collect a binary (PDF) response body as a Buffer
const binary = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

module.exports = {
  PASSWORD,
  api,
  tokenFor,
  createAdmin,
  createTechnician,
  createClient,
  createService,
  createAssignedService,
  createInvoice,
  photoPng,
  signatureDataUrl,
  binary
};
