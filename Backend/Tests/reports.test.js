const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { useTestDb } = require("./setup/db");
const { outbox } = require("./mocks/nodemailer");
const ServiceReport = require("../Models/ServiceReport");
const { UPLOAD_DIR } = require("../Services/storage");
const {
  api, tokenFor, createAdmin, createTechnician, createClient, createAssignedService, photoPng, signatureDataUrl, binary
} = require("./helpers");

useTestDb();

const reportBody = (service) => ({
  serviceId: String(service._id),
  arrivalTime: "2026-11-08T09:15:00.000Z",
  departureTime: "2026-11-08T11:40:00.000Z",
  findings: "Refrigerant low, flare joint leaking",
  workDone: "Fixed flare joint, topped up R410A",
  partsUsed: [{ name: "R410A (kg)", quantity: 2 }, { name: "Flare nut" }],
  recommendations: "Service every 3 months"
});

// Count embedded images in a PDF (pdfkit writes one /Subtype /Image object per image)
const imageCount = (pdf) => (pdf.toString("latin1").match(/\/Subtype \/Image/g) || []).length;

let admin;
let adminApi;
let tech;
let techApi;
let service;
beforeEach(async () => {
  admin = await createAdmin();
  adminApi = api(tokenFor(admin));
  tech = await createTechnician();
  techApi = api(tokenFor(tech));
  const client = await createClient({ email: "adaeze@gmail.com" });
  service = await createAssignedService(tech, { client: client._id, status: "in_progress" });
});

const createReport = async () => (await techApi.post("/api/reports").send(reportBody(service))).body.report;
const sign = (reportId, signer, name = signer === "client" ? "Adaeze Okafor" : "Tunde Bakare") =>
  techApi.post(`/api/reports/${reportId}/sign`).send({ signer, name, signature: signatureDataUrl() });
const getPdf = (agent, reportId, query = "") =>
  agent.get(`/api/reports/${reportId}/pdf${query}`).buffer(true).parse(binary);

describe("Filing a report", () => {
  test("technician files a report for their job", async () => {
    const res = await techApi.post("/api/reports").send(reportBody(service));
    assert.equal(res.status, 201);
    assert.equal(res.body.report.status, "draft");
    assert.equal(res.body.report.partsUsed[1].quantity, 1, "quantity defaults to 1");
    assert.equal(res.body.report.client.email, "adaeze@gmail.com", "client copied from the service");
  });

  test("only one report per service -> 409", async () => {
    await createReport();
    assert.equal((await techApi.post("/api/reports").send(reportBody(service))).status, 409);
  });

  test("can't file for someone else's job (404), or as admin (403)", async () => {
    const other = await createTechnician();
    assert.equal((await api(tokenFor(other)).post("/api/reports").send(reportBody(service))).status, 404);
    assert.equal((await adminApi.post("/api/reports").send(reportBody(service))).status, 403);
  });

  test("can't file for a pending, completed or cancelled job", async () => {
    for (const status of ["completed", "cancelled"]) {
      const s = await createAssignedService(tech, { status });
      const res = await techApi.post("/api/reports").send(reportBody(s));
      assert.equal(res.status, 400, status);
    }
  });

  test("findings and work done are required", async () => {
    const res = await techApi.post("/api/reports").send({ serviceId: String(service._id) });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.details.map((d) => d.field).sort(), ["findings", "workDone"]);
  });

  test("technician can edit until someone signs", async () => {
    const report = await createReport();
    assert.equal((await techApi.patch(`/api/reports/${report._id}`).send({ recommendations: "Replace fan motor" })).status, 200);
    await sign(report._id, "technician");
    const res = await techApi.patch(`/api/reports/${report._id}`).send({ recommendations: "Changed after signing" });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /signed and can no longer be edited/);
  });
});

describe("Viewing reports", () => {
  test("technicians only see their own; admin sees all and can filter", async () => {
    const mine = await createReport();
    const other = await createTechnician();
    const otherService = await createAssignedService(other, { status: "in_progress" });
    await api(tokenFor(other)).post("/api/reports").send(reportBody(otherService));

    const techList = await techApi.get("/api/reports");
    assert.deepEqual(techList.body.data.map((r) => r._id), [mine._id]);
    assert.equal((await adminApi.get("/api/reports")).body.data.length, 2);
    assert.equal((await adminApi.get(`/api/reports?technician=${other._id}`)).body.data.length, 1);
    assert.equal((await api(tokenFor(other)).get(`/api/reports/${mine._id}`)).status, 404);
  });

  test("get the report for a service", async () => {
    const report = await createReport();
    const res = await adminApi.get(`/api/reports/service/${service._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.report._id, report._id);
  });
});

describe("Photos", () => {
  test("upload images; they are stored and listed on the report", async () => {
    const report = await createReport();
    const res = await techApi
      .post(`/api/reports/${report._id}/photos`)
      .attach("photos", photoPng(), { filename: "before.png", contentType: "image/png" })
      .attach("photos", photoPng(), { filename: "after.png", contentType: "image/png" });
    assert.equal(res.status, 200);
    assert.equal(res.body.photos.length, 2);
    for (const url of res.body.photos) {
      assert.match(url, /^http:\/\/localhost:5000\/uploads\/report-photos\/.+\.png$/);
      const file = path.join(UPLOAD_DIR, url.split("/uploads/")[1]);
      assert.ok(fs.existsSync(file), "file saved to disk");
    }
  });

  test("non-image files are rejected", async () => {
    const report = await createReport();
    const res = await techApi
      .post(`/api/reports/${report._id}/photos`)
      .attach("photos", Buffer.from("%PDF-1.4"), { filename: "doc.pdf", contentType: "application/pdf" });
    assert.equal(res.status, 400);
  });

  test("more than 10 photos in one upload -> 400", async () => {
    const report = await createReport();
    let req = techApi.post(`/api/reports/${report._id}/photos`);
    for (let i = 0; i < 11; i++) req = req.attach("photos", photoPng(), { filename: `p${i}.png`, contentType: "image/png" });
    assert.equal((await req).status, 400);
  });

  test("no photos attached -> 400", async () => {
    const report = await createReport();
    assert.equal((await techApi.post(`/api/reports/${report._id}/photos`)).status, 400);
  });

  test("no more photos once signed", async () => {
    const report = await createReport();
    await sign(report._id, "client");
    const res = await techApi
      .post(`/api/reports/${report._id}/photos`)
      .attach("photos", photoPng(), { filename: "late.png", contentType: "image/png" });
    assert.equal(res.status, 400);
  });
});

describe("Signatures", () => {
  test("technician and client sign -> report becomes signed", async () => {
    const report = await createReport();
    const first = await sign(report._id, "technician");
    assert.equal(first.status, 200);
    assert.equal(first.body.report.status, "awaiting_signatures");
    const second = await sign(report._id, "client");
    assert.equal(second.body.report.status, "signed");
    assert.equal(second.body.report.isFullySigned, true);
    assert.equal(second.body.report.clientSignature.name, "Adaeze Okafor");
    assert.match(second.body.report.clientSignature.imageUrl, /\/uploads\/signatures\/.+\.png$/);
  });

  test("each party signs only once", async () => {
    const report = await createReport();
    await sign(report._id, "client");
    assert.equal((await sign(report._id, "client")).status, 400);
  });

  test("signature must be an image data URL", async () => {
    const report = await createReport();
    const res = await techApi.post(`/api/reports/${report._id}/sign`).send({ signer: "client", name: "Adaeze", signature: "hello" });
    assert.equal(res.status, 400);
  });

  test("admin can't sign on the technician's behalf -> 403", async () => {
    const report = await createReport();
    const res = await adminApi.post(`/api/reports/${report._id}/sign`).send({ signer: "client", name: "X Y", signature: signatureDataUrl() });
    assert.equal(res.status, 403);
  });
});

describe("Report PDF", () => {
  const addPhoto = (reportId) =>
    techApi.post(`/api/reports/${reportId}/photos`).attach("photos", photoPng(), { filename: "p.png", contentType: "image/png" });

  test("technician downloads a draft PDF (photo included, no signatures yet)", async () => {
    const report = await createReport();
    await addPhoto(report._id);
    const res = await getPdf(techApi, report._id);
    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "application/pdf");
    assert.match(res.headers["content-disposition"], /^attachment; filename="Service-Report-SRV-\d{4}-\d{5}\.pdf"$/);
    assert.equal(res.body.subarray(0, 5).toString(), "%PDF-");
    assert.equal(imageCount(res.body), 1);
  });

  test("signed PDF embeds the photo and both signatures; ?inline=true for browser view", async () => {
    const report = await createReport();
    await addPhoto(report._id);
    await sign(report._id, "technician");
    await sign(report._id, "client");
    const res = await getPdf(adminApi, report._id, "?inline=true");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-disposition"], /^inline;/);
    assert.equal(imageCount(res.body), 3);
  });

  test("another technician can't download it -> 404", async () => {
    const report = await createReport();
    const other = await createTechnician();
    assert.equal((await api(tokenFor(other)).get(`/api/reports/${report._id}/pdf`)).status, 404);
  });
});

describe("Emailing the report to the client (admin)", () => {
  const signedReport = async () => {
    const report = await createReport();
    await sign(report._id, "technician");
    await sign(report._id, "client");
    return report;
  };

  test("not allowed until both parties have signed", async () => {
    const report = await createReport();
    const res = await adminApi.post(`/api/reports/${report._id}/send-email`).send({});
    assert.equal(res.status, 400);
    assert.equal(outbox.messages.length, 0);
  });

  test("sends the PDF to the client's email", async () => {
    const report = await signedReport();
    const res = await adminApi.post(`/api/reports/${report._id}/send-email`).send({});
    assert.equal(res.status, 200);
    const mail = outbox.find((m) => m.to === "adaeze@gmail.com");
    assert.ok(mail);
    assert.match(mail.attachments[0].filename, /^Service-Report-SRV-\d{4}-\d{5}\.pdf$/);
    assert.equal(mail.attachments[0].content.subarray(0, 5).toString(), "%PDF-");
  });

  test("can send to another address; invalid address -> 400", async () => {
    const report = await signedReport();
    assert.equal((await adminApi.post(`/api/reports/${report._id}/send-email`).send({ email: "husband@gmail.com" })).status, 200);
    assert.ok(outbox.find((m) => m.to === "husband@gmail.com"));
    assert.equal((await adminApi.post(`/api/reports/${report._id}/send-email`).send({ email: "nope" })).status, 400);
  });

  test("client without email and no address given -> 400", async () => {
    const report = await signedReport();
    const stored = await ServiceReport.findById(report._id).populate("client");
    stored.client.email = undefined;
    await stored.client.save();
    assert.equal((await adminApi.post(`/api/reports/${report._id}/send-email`).send({})).status, 400);
  });

  test("SMTP down -> clear 502", async () => {
    const report = await signedReport();
    outbox.fail();
    const res = await adminApi.post(`/api/reports/${report._id}/send-email`).send({});
    assert.equal(res.status, 502);
    assert.match(res.body.message, /couldn't send the email/);
  });

  test("technicians can't email reports -> 403", async () => {
    const report = await signedReport();
    assert.equal((await techApi.post(`/api/reports/${report._id}/send-email`).send({})).status, 403);
  });
});
