const fs = require("fs/promises");
const path = require("path");
const PDFDocument = require("pdfkit");
const { company, apiUrl } = require("../Config/env");
const { UPLOAD_DIR } = require("./storage");

const BLUE = "#1e3a8a";
const GREY = "#64748b";
const PAGE_BOTTOM = 842 - 50; // A4 height minus bottom margin
const LEFT = 50;
const WIDTH = 495;

// Times are shown in the business's time zone, not the server's (hosts usually run on UTC)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: company.timezone }) : "-";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: company.timezone
      })
    : "-";
const label = (s) => (s ? String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-");

// pdfkit can only embed PNG and JPEG
const isEmbeddable = (buf) =>
  buf && buf.length > 4 && ((buf[0] === 0x89 && buf[1] === 0x50) || (buf[0] === 0xff && buf[1] === 0xd8));

// Loads an image saved by Services/storage.js. Only our own storage locations are read
// (local /uploads or Cloudinary), never arbitrary URLs. Returns null if it can't be embedded.
const loadImage = async (url, cloudinaryFormat) => {
  try {
    let buf;
    const localPrefix = `${apiUrl}/uploads/`;
    if (url.startsWith(localPrefix)) {
      const file = path.resolve(UPLOAD_DIR, decodeURIComponent(url.slice(localPrefix.length)));
      if (!file.startsWith(UPLOAD_DIR + path.sep)) return null;
      buf = await fs.readFile(file);
    } else if (url.startsWith("https://res.cloudinary.com/")) {
      // Ask Cloudinary for a PDF-friendly format (handles WEBP uploads)
      const converted = url.replace("/upload/", `/upload/${cloudinaryFormat}/`);
      const res = await fetch(converted, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }
    return isEmbeddable(buf) ? buf : null;
  } catch {
    return null;
  }
};

// Builds the service report PDF and resolves with a Buffer.
// Expects the report with `service`, `client` and `technician` populated.
const buildReportPdf = async (report) => {
  const service = report.service || {};
  const client = report.client || {};
  const technician = report.technician || {};
  const signed = Boolean(report.technicianSignature && report.clientSignature);

  // Fetch images up front (the PDF is drawn synchronously)
  const [photos, techSig, clientSig] = await Promise.all([
    Promise.all((report.photos || []).map((u) => loadImage(u, "f_jpg,w_800"))),
    report.technicianSignature ? loadImage(report.technicianSignature.imageUrl, "f_png") : null,
    report.clientSignature ? loadImage(report.clientSignature.imageUrl, "f_png") : null
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Service Report ${service.serviceNo || ""}` } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ensureSpace = (height) => {
      if (doc.y + height > PAGE_BOTTOM) doc.addPage();
    };
    // keepWith: room needed below the heading so it never sits alone at the bottom of a page
    const heading = (text, keepWith = 40) => {
      ensureSpace(30 + keepWith);
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(BLUE).text(text.toUpperCase(), LEFT, doc.y, { width: WIDTH });
      const y = doc.y + 2;
      doc.moveTo(LEFT, y).lineTo(LEFT + WIDTH, y).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
      doc.moveDown(0.5).font("Helvetica").fontSize(10).fillColor("#000000");
    };
    const paragraph = (text) => doc.font("Helvetica").fontSize(10).fillColor("#000000").text(text || "-", LEFT, doc.y, { width: WIDTH });

    // Header
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#000000").text(company.name, LEFT, 50, { width: 280 });
    doc.font("Helvetica").fontSize(9).fillColor(GREY);
    [company.address, company.phone, company.email].filter(Boolean).forEach((line) => doc.text(line, { width: 280 }));
    const headerBottom = doc.y;

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#000000").text("SERVICE REPORT", 300, 50, { width: 245, align: "right" });
    doc.font("Helvetica").fontSize(10);
    doc.text(`Service No: ${service.serviceNo || "-"}`, 300, doc.y + 4, { width: 245, align: "right" });
    doc.text(`Report Date: ${fmtDate(report.createdAt)}`, 300, doc.y, { width: 245, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fillColor(signed ? "#15803d" : "#b91c1c")
      .text(signed ? "SIGNED" : "DRAFT - NOT FULLY SIGNED", 300, doc.y, { width: 245, align: "right" });
    doc.y = Math.max(doc.y, headerBottom) + 10;

    // Client / job details in two columns
    heading("Job Details");
    const top = doc.y;
    const col = (x, rows) => {
      doc.y = top;
      rows.forEach(([k, v]) => {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(GREY).text(k, x, doc.y, { width: 230 });
        doc.font("Helvetica").fontSize(10).fillColor("#000000").text(v || "-", x, doc.y, { width: 230 });
        doc.moveDown(0.3);
      });
      return doc.y;
    };
    const leftEnd = col(LEFT, [
      ["Client", client.name],
      ["Phone", client.phone],
      ["Email", client.email],
      ["Address", service.address || client.address]
    ]);
    const rightEnd = col(315, [
      ["Job", service.title],
      ["Service Type", label(service.serviceType)],
      ["Technician", [technician.name, technician.phone].filter(Boolean).join(" - ")],
      ["Arrival / Departure", `${fmtDateTime(report.arrivalTime)}  ->  ${fmtDateTime(report.departureTime)}`]
    ]);
    doc.x = LEFT;
    doc.y = Math.max(leftEnd, rightEnd);

    // AC units
    if (service.acUnits && service.acUnits.length) {
      heading("AC Units");
      service.acUnits.forEach((u, i) => {
        const parts = [u.brand, u.model, u.type && label(u.type), u.capacity, u.location && `(${u.location})`].filter(Boolean);
        paragraph(`${i + 1}. ${parts.join("  ") || "Unit details not recorded"}`);
      });
    }

    heading("Findings");
    paragraph(report.findings);

    heading("Work Done");
    paragraph(report.workDone);

    if (report.partsUsed && report.partsUsed.length) {
      heading("Parts Used", 60);
      const y0 = doc.y;
      doc.rect(LEFT, y0 - 3, WIDTH, 18).fill(BLUE);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
      doc.text("Part", LEFT + 6, y0, { width: 380 });
      doc.text("Qty", LEFT + 400, y0, { width: 90 });
      doc.fillColor("#000000").font("Helvetica");
      let y = y0 + 20;
      report.partsUsed.forEach((p, i) => {
        if (y + 18 > PAGE_BOTTOM) {
          doc.addPage();
          y = 50;
        }
        if (i % 2 === 1) doc.rect(LEFT, y - 3, WIDTH, 18).fill("#f1f5f9").fillColor("#000000");
        doc.text(p.name, LEFT + 6, y, { width: 380 });
        doc.text(String(p.quantity || 1), LEFT + 400, y, { width: 90 });
        y += 18;
      });
      doc.x = LEFT;
      doc.y = y;
    }

    if (report.recommendations) {
      heading("Recommendations");
      paragraph(report.recommendations);
    }

    // Photos: 3 per row
    const usable = photos.filter(Boolean);
    if ((report.photos || []).length) {
      const w = 155;
      const h = 116;
      heading(`Photos (${report.photos.length})`, h + 10);
      const gap = 15;
      usable.forEach((img, i) => {
        const colIdx = i % 3;
        if (colIdx === 0) ensureSpace(h + 10);
        const rowY = doc.y;
        try {
          doc.image(img, LEFT + colIdx * (w + gap), rowY, { fit: [w, h], align: "center", valign: "center" });
        } catch {
          /* corrupt image: skip */
        }
        if (colIdx === 2 || i === usable.length - 1) doc.y = rowY + h + 10;
      });
      if (usable.length < report.photos.length) {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor(GREY);
        doc.text(`${report.photos.length - usable.length} photo(s) could not be included in this PDF.`, LEFT, doc.y, { width: WIDTH });
      }
      doc.x = LEFT;
    }

    // Signatures side by side
    heading("Signatures", 150); // boxes + names + footer stay together with the heading
    const sigTop = doc.y;
    const signatureBox = (x, title, sig, img) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text(title, x, sigTop, { width: 230 });
      const boxY = sigTop + 16;
      doc.rect(x, boxY, 230, 70).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
      if (img) {
        try {
          doc.image(img, x + 5, boxY + 5, { fit: [220, 60], align: "center", valign: "center" });
        } catch {
          img = null;
        }
      }
      if (!img) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(GREY)
          .text(sig ? "Signature on file" : "Not signed", x, boxY + 30, { width: 230, align: "center" });
      }
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      doc.text(`Name: ${sig ? sig.name : "-"}`, x, boxY + 76, { width: 230 });
      doc.text(`Date: ${sig ? fmtDateTime(sig.signedAt) : "-"}`, x, doc.y, { width: 230 });
    };
    signatureBox(LEFT, "Technician", report.technicianSignature, techSig);
    signatureBox(315, "Client", report.clientSignature, clientSig);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(GREY)
      .text(`Thank you for choosing ${company.name}.`, LEFT, doc.y + 15, { align: "center", width: WIDTH });
    doc.end();
  });
};

module.exports = { buildReportPdf };
