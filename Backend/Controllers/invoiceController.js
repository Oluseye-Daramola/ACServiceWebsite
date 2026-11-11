const Invoice = require("../Models/Invoice");
const Service = require("../Models/Service");
const Transaction = require("../Models/Transaction");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination, escapeRegex } = require("../Utils/pagination");
const { generateInvoiceNo } = require("../Utils/generateInvoiceNo");
const { buildInvoicePdf } = require("../Services/invoicePdf");
const { sendInvoiceEmail } = require("../Services/emailService");
const { buildInvoiceShareLink, verifyPublicPdfToken } = require("../Services/whatsapp");

const populateInvoice = (query) =>
  query
    .populate("client", "name email phone address")
    .populate("service", "serviceNo title serviceType status completedAt")
    .populate("createdBy", "name");

const findInvoice = async (id) => {
  const invoice = await populateInvoice(Invoice.findById(id));
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return invoice;
};

const sendPdf = async (res, invoice, disposition = "attachment") => {
  const pdf = await buildInvoicePdf(invoice);
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="${invoice.invoiceNo}.pdf"`,
    "Content-Length": pdf.length
  });
  res.send(pdf);
};

// POST /api/invoices
const createInvoice = asyncHandler(async (req, res) => {
  const { serviceId, ...fields } = req.body;

  const service = await Service.findById(serviceId);
  if (!service) throw ApiError.notFound("Service not found");
  if (service.status === "cancelled") throw ApiError.badRequest("Cannot invoice a cancelled service");

  const existing = await Invoice.findOne({ service: service._id, status: { $ne: "cancelled" } });
  if (existing) throw ApiError.conflict(`Service already has invoice ${existing.invoiceNo}`);

  const invoice = await Invoice.create({
    ...fields,
    invoiceNo: await generateInvoiceNo(),
    service: service._id,
    client: service.client,
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, invoice: await findInvoice(invoice._id) });
});

// GET /api/invoices?status=&client=&search=&from=&to=
const getInvoices = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.client) filter.client = req.query.client;
  if (req.query.search) filter.invoiceNo = new RegExp(escapeRegex(req.query.search), "i");
  if (req.query.from || req.query.to) {
    filter.issueDate = {};
    if (req.query.from) filter.issueDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.issueDate.$lte = new Date(req.query.to);
  }

  const [invoices, total] = await Promise.all([
    populateInvoice(Invoice.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter)
  ]);

  res.json({ success: true, data: invoices, pagination: meta(total) });
});

// GET /api/invoices/:id  (with its payment history)
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await findInvoice(req.params.id);
  const transactions = await Transaction.find({ invoice: invoice._id }).sort({ paidAt: -1 });
  res.json({ success: true, invoice, transactions });
});

// PATCH /api/invoices/:id  (only before any payment is recorded)
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.status === "cancelled") throw ApiError.badRequest("Cannot edit a cancelled invoice");
  if (invoice.amountPaid > 0) throw ApiError.badRequest("Cannot edit an invoice that already has payments");

  Object.assign(invoice, req.body);
  await invoice.save();
  res.json({ success: true, invoice: await findInvoice(invoice._id) });
});

// PATCH /api/invoices/:id/cancel
const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.amountPaid > 0) throw ApiError.badRequest("Reverse the payments on this invoice before cancelling it");

  invoice.status = "cancelled";
  await invoice.save();
  res.json({ success: true, invoice });
});

// GET /api/invoices/:id/pdf  (admin download; add ?inline=true to view in the browser)
const downloadPdf = asyncHandler(async (req, res) => {
  const invoice = await findInvoice(req.params.id);
  await sendPdf(res, invoice, req.query.inline === "true" ? "inline" : "attachment");
});

// GET /api/invoices/public/:id/pdf?token=  (no login; link shared with the client)
const publicPdf = asyncHandler(async (req, res) => {
  if (!req.query.token) throw ApiError.unauthorized("Missing download token");
  verifyPublicPdfToken(req.query.token, req.params.id);
  const invoice = await findInvoice(req.params.id);
  await sendPdf(res, invoice, "inline");
});

// POST /api/invoices/:id/send-email  { email? }
const emailInvoice = asyncHandler(async (req, res) => {
  const invoice = await findInvoice(req.params.id);
  if (invoice.status === "cancelled") throw ApiError.badRequest("Cannot send a cancelled invoice");

  const to = req.body.email || invoice.client.email;
  if (!to) throw ApiError.badRequest("Client has no email address. Provide one in the request body.");

  const pdf = await buildInvoicePdf(invoice);
  await sendInvoiceEmail(invoice, pdf, to);

  await Invoice.updateOne({ _id: invoice._id }, { $push: { sentLog: { channel: "email", to } } });
  res.json({ success: true, message: `Invoice sent to ${to}` });
});

// POST /api/invoices/:id/share-whatsapp  { phone? }
// Returns a wa.me link; open it to send the message (with a PDF download link) from WhatsApp.
const shareWhatsapp = asyncHandler(async (req, res) => {
  const invoice = await findInvoice(req.params.id);
  if (invoice.status === "cancelled") throw ApiError.badRequest("Cannot share a cancelled invoice");

  const share = buildInvoiceShareLink(invoice, req.body.phone);
  await Invoice.updateOne({ _id: invoice._id }, { $push: { sentLog: { channel: "whatsapp", to: share.to } } });

  res.json({ success: true, whatsappUrl: share.url, pdfLink: share.pdfLink });
});

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  cancelInvoice,
  downloadPdf,
  publicPdf,
  emailInvoice,
  shareWhatsapp
};
