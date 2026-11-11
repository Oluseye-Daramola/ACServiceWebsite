const jwt = require("jsonwebtoken");
const ApiError = require("../Utils/apiError");
const { jwtSecret, apiUrl, company } = require("../Config/env");

const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "234";

// "0803 123 4567" -> "2348031234567" (wa.me needs international format, digits only)
const normalizePhone = (phone) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  if (digits.length < 10) throw ApiError.badRequest("A valid phone number is required for WhatsApp");
  return digits;
};

// A time-limited link that lets the client download the PDF without logging in
const createPublicPdfLink = (invoice, expiresIn = "7d") => {
  const token = jwt.sign({ purpose: "invoice-pdf", invoiceId: String(invoice._id) }, jwtSecret, { expiresIn });
  return `${apiUrl}/api/invoices/public/${invoice._id}/pdf?token=${token}`;
};

const verifyPublicPdfToken = (token, invoiceId) => {
  const decoded = jwt.verify(token, jwtSecret);
  if (decoded.purpose !== "invoice-pdf" || decoded.invoiceId !== String(invoiceId)) {
    throw ApiError.unauthorized("Invalid download link");
  }
};

// Returns a wa.me link that opens WhatsApp with a pre-filled message to the client
const buildInvoiceShareLink = (invoice, phone) => {
  const to = normalizePhone(phone || invoice.client.phone);
  const pdfLink = createPublicPdfLink(invoice);
  const text = [
    `Hello ${invoice.client.name},`,
    `Here is your invoice ${invoice.invoiceNo} from ${company.name}.`,
    `Total: ${company.currency} ${invoice.total.toLocaleString()}`,
    `Balance due: ${company.currency} ${invoice.balance.toLocaleString()}`,
    `Download PDF: ${pdfLink}`
  ].join("\n");

  return { to, pdfLink, url: `https://wa.me/${to}?text=${encodeURIComponent(text)}` };
};

module.exports = { buildInvoiceShareLink, createPublicPdfLink, verifyPublicPdfToken, normalizePhone };
