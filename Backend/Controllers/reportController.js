const ServiceReport = require("../Models/ServiceReport");
const Service = require("../Models/Service");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination } = require("../Utils/pagination");
const { saveImage, saveDataUrlImage } = require("../Services/storage");
const { buildReportPdf } = require("../Services/reportPdf");
const { sendReportEmail } = require("../Services/emailService");

const populateReport = (query) =>
  query
    .populate("service", "serviceNo title serviceType status address scheduledDate acUnits completedAt")
    .populate("client", "name email phone address")
    .populate("technician", "name email phone");

const findAccessibleReport = async (id, user) => {
  const filter = { _id: id };
  if (user.role === "technician") filter.technician = user._id;
  const report = await ServiceReport.findOne(filter);
  if (!report) throw ApiError.notFound("Report not found");
  return report;
};

// Once anyone has signed, the report content is locked
const assertEditable = (report) => {
  if (report.technicianSignature || report.clientSignature) {
    throw ApiError.badRequest("This report has been signed and can no longer be edited");
  }
};

// POST /api/reports  (technician fills the report for their assigned service)
const createReport = asyncHandler(async (req, res) => {
  const { serviceId, ...fields } = req.body;

  const service = await Service.findOne({ _id: serviceId, technician: req.user._id });
  if (!service) throw ApiError.notFound("Service not found or not assigned to you");
  if (!["assigned", "in_progress"].includes(service.status)) {
    throw ApiError.badRequest(`Cannot file a report for a ${service.status} service`);
  }
  if (await ServiceReport.exists({ service: service._id })) {
    throw ApiError.conflict("A report already exists for this service. Update it instead.");
  }

  const report = await ServiceReport.create({
    ...fields,
    service: service._id,
    client: service.client,
    technician: req.user._id
  });

  res.status(201).json({ success: true, report: await populateReport(ServiceReport.findById(report._id)) });
});

// GET /api/reports?status=
const getReports = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.technician && req.user.role === "admin") filter.technician = req.query.technician;
  if (req.user.role === "technician") filter.technician = req.user._id;

  const [reports, total] = await Promise.all([
    populateReport(ServiceReport.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ServiceReport.countDocuments(filter)
  ]);

  res.json({ success: true, data: reports, pagination: meta(total) });
});

// GET /api/reports/:id
const getReport = asyncHandler(async (req, res) => {
  const report = await findAccessibleReport(req.params.id, req.user);
  res.json({ success: true, report: await populateReport(ServiceReport.findById(report._id)) });
});

// GET /api/reports/service/:id
const getReportByService = asyncHandler(async (req, res) => {
  const filter = { service: req.params.id };
  if (req.user.role === "technician") filter.technician = req.user._id;

  const report = await populateReport(ServiceReport.findOne(filter));
  if (!report) throw ApiError.notFound("No report for this service yet");
  res.json({ success: true, report });
});

// PATCH /api/reports/:id
const updateReport = asyncHandler(async (req, res) => {
  const report = await findAccessibleReport(req.params.id, req.user);
  assertEditable(report);

  Object.assign(report, req.body);
  await report.save();
  res.json({ success: true, report });
});

// POST /api/reports/:id/photos  (multipart/form-data, field name "photos")
const addPhotos = asyncHandler(async (req, res) => {
  const report = await findAccessibleReport(req.params.id, req.user);
  assertEditable(report);
  if (!req.files || !req.files.length) throw ApiError.badRequest("Attach at least one image in the 'photos' field");

  const urls = await Promise.all(req.files.map((file) => saveImage(file, "report-photos")));
  report.photos.push(...urls);
  await report.save();

  res.json({ success: true, photos: report.photos });
});

// POST /api/reports/:id/sign
// The technician captures both signatures on their device: their own and the client's.
const signReport = asyncHandler(async (req, res) => {
  const report = await findAccessibleReport(req.params.id, req.user);
  const { signer, name, signature } = req.body;
  const field = signer === "technician" ? "technicianSignature" : "clientSignature";

  if (report[field]) throw ApiError.badRequest(`The ${signer} has already signed this report`);

  const imageUrl = await saveDataUrlImage(signature, "signatures");
  report[field] = { name, imageUrl, signedAt: new Date() };
  await report.save();

  res.json({
    success: true,
    message: report.isFullySigned
      ? "Report fully signed. The service can now be marked as completed."
      : `${signer} signature saved`,
    report
  });
});

// GET /api/reports/:id/pdf  (admin, or the report's technician; ?inline=true to view in the browser)
// Unsigned reports still download, clearly marked DRAFT.
const downloadReportPdf = asyncHandler(async (req, res) => {
  const found = await findAccessibleReport(req.params.id, req.user);
  const report = await populateReport(ServiceReport.findById(found._id));

  const pdf = await buildReportPdf(report);
  const disposition = req.query.inline === "true" ? "inline" : "attachment";
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="Service-Report-${report.service.serviceNo}.pdf"`,
    "Content-Length": pdf.length
  });
  res.send(pdf);
});

// POST /api/reports/:id/send-email  { email? }  (admin; defaults to the client's email)
const emailReport = asyncHandler(async (req, res) => {
  const report = await populateReport(ServiceReport.findById(req.params.id));
  if (!report) throw ApiError.notFound("Report not found");
  if (!report.isFullySigned) {
    throw ApiError.badRequest("Only a report signed by both the technician and the client can be sent");
  }

  const to = req.body.email || report.client.email;
  if (!to) throw ApiError.badRequest("Client has no email address. Provide one in the request body.");

  const pdf = await buildReportPdf(report);
  await sendReportEmail(report, pdf, to);
  res.json({ success: true, message: `Service report sent to ${to}` });
});

module.exports = {
  createReport,
  getReports,
  getReport,
  getReportByService,
  updateReport,
  addPhotos,
  signReport,
  downloadReportPdf,
  emailReport
};
