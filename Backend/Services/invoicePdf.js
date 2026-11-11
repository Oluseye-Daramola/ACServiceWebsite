const PDFDocument = require("pdfkit");
const { company } = require("../Config/env");

const money = (n) =>
  `${company.currency} ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: company.timezone }) : "-";

// Builds the invoice PDF and resolves with a Buffer.
// Expects the invoice with `client` and `service` populated.
const buildInvoicePdf = (invoice) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const client = invoice.client || {};
    const service = invoice.service || {};

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(company.name, 50, 50);
    doc.fontSize(9).font("Helvetica");
    [company.address, company.phone, company.email].filter(Boolean).forEach((line) => doc.text(line));

    doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", 350, 50, { align: "right" });
    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 350, 85, { align: "right" });
    doc.text(`Issue Date: ${date(invoice.issueDate)}`, { align: "right" });
    doc.text(`Due Date: ${date(invoice.dueDate)}`, { align: "right" });
    doc.font("Helvetica-Bold").text(`Status: ${invoice.status.replace("_", " ").toUpperCase()}`, { align: "right" });

    // Bill to
    doc.moveDown(2);
    const billY = 150;
    doc.font("Helvetica-Bold").fontSize(11).text("Bill To:", 50, billY);
    doc.font("Helvetica").fontSize(10);
    [client.name, client.address, client.phone, client.email].filter(Boolean).forEach((line) => doc.text(line));

    doc.font("Helvetica-Bold").fontSize(11).text("Service:", 320, billY);
    doc.font("Helvetica").fontSize(10);
    [service.serviceNo, service.title, service.serviceType && service.serviceType.replace("_", " ")]
      .filter(Boolean)
      .forEach((line) => doc.text(line, 320));

    // Items table
    let y = 250;
    const cols = { desc: 50, qty: 320, price: 380, amount: 470 };
    doc.rect(50, y - 5, 495, 20).fill("#1e3a8a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
    doc.text("Description", cols.desc + 5, y);
    doc.text("Qty", cols.qty, y);
    doc.text("Unit Price", cols.price, y);
    doc.text("Amount", cols.amount, y);
    doc.fillColor("#000000").font("Helvetica");

    y += 25;
    invoice.items.forEach((item, i) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      if (i % 2 === 1) doc.rect(50, y - 5, 495, 20).fill("#f1f5f9").fillColor("#000000");
      doc.text(item.description, cols.desc + 5, y, { width: 260 });
      doc.text(String(item.quantity), cols.qty, y);
      doc.text(money(item.unitPrice), cols.price, y, { width: 85 });
      doc.text(money(item.amount), cols.amount, y, { width: 75 });
      y += 22;
    });

    // Totals
    y += 10;
    doc.moveTo(320, y).lineTo(545, y).stroke();
    y += 10;
    const totalLine = (label, value, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").text(label, 320, y).text(value, 430, y, { width: 115, align: "right" });
      y += 18;
    };
    totalLine("Subtotal", money(invoice.subtotal));
    if (invoice.discount) totalLine("Discount", `- ${money(invoice.discount)}`);
    if (invoice.taxRate) totalLine(`Tax (${invoice.taxRate}%)`, money(invoice.taxAmount));
    totalLine("Total", money(invoice.total), true);
    totalLine("Amount Paid", money(invoice.amountPaid));
    totalLine("Balance Due", money(invoice.balance), true);

    if (invoice.notes) {
      doc.moveDown(2).font("Helvetica-Bold").text("Notes", 50).font("Helvetica").text(invoice.notes, { width: 495 });
    }

    doc.fontSize(9).fillColor("#64748b").text("Thank you for your business.", 50, 770, { align: "center", width: 495 });
    doc.end();
  });

module.exports = { buildInvoicePdf };
