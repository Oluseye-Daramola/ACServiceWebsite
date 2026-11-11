const Service = require("../Models/Service");
const Client = require("../Models/Client");
const Invoice = require("../Models/Invoice");
const ServiceReport = require("../Models/ServiceReport");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination, escapeRegex } = require("../Utils/pagination");
const { generateServiceNo } = require("../Utils/generateInvoiceNo");
const { assignTechnician, notifyTechnicianAssigned } = require("../Services/assignment");

const populateService = (query) =>
  query.populate("client", "name email phone address").populate("technician", "name email phone");

// Admin sees any service; a technician only sees services assigned to them
const findAccessibleService = async (id, user) => {
  const filter = { _id: id };
  if (user.role === "technician") filter.technician = user._id;
  const service = await populateService(Service.findOne(filter));
  if (!service) throw ApiError.notFound("Service not found");
  return service;
};

// POST /api/services
const createService = asyncHandler(async (req, res) => {
  const { clientId, technicianId, ...fields } = req.body;

  const client = await Client.findById(clientId);
  if (!client) throw ApiError.notFound("Client not found");

  const service = new Service({
    ...fields,
    address: fields.address || client.address,
    serviceNo: await generateServiceNo(),
    client: client._id,
    createdBy: req.user._id
  });

  const technician = technicianId ? await assignTechnician(service, technicianId) : null;
  await service.save();
  if (technician) notifyTechnicianAssigned(technician, service);

  res.status(201).json({ success: true, service: await populateService(Service.findById(service._id)) });
});

// GET /api/services?status=&technician=&client=&serviceType=&search=
const getServices = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = {};

  for (const key of ["status", "serviceType", "priority", "client", "technician"]) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.user.role === "technician") filter.technician = req.user._id;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ serviceNo: rx }, { title: rx }, { address: rx }];
  }

  const [services, total] = await Promise.all([
    populateService(Service.find(filter)).sort({ scheduledDate: 1, createdAt: -1 }).skip(skip).limit(limit),
    Service.countDocuments(filter)
  ]);

  res.json({ success: true, data: services, pagination: meta(total) });
});

// GET /api/services/:id
const getService = asyncHandler(async (req, res) => {
  const service = await findAccessibleService(req.params.id, req.user);
  const report = await ServiceReport.findOne({ service: service._id });

  const response = { success: true, service, report };
  if (req.user.role === "admin") {
    response.invoice = await Invoice.findOne({ service: service._id, status: { $ne: "cancelled" } });
  }
  res.json(response);
});

// PATCH /api/services/:id
const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound("Service not found");

  const { clientId, ...fields } = req.body;
  if (clientId) {
    if (!(await Client.exists({ _id: clientId }))) throw ApiError.notFound("Client not found");
    service.client = clientId;
  }

  Object.assign(service, fields);
  await service.save();
  res.json({ success: true, service: await populateService(Service.findById(service._id)) });
});

// PATCH /api/services/:id/assign
const assignService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound("Service not found");

  const technician = await assignTechnician(service, req.body.technicianId);
  await service.save();
  notifyTechnicianAssigned(technician, service);

  res.json({ success: true, service: await populateService(Service.findById(service._id)) });
});

// PATCH /api/services/:id/status  (admin override, e.g. cancel or reopen)
// Intentional: the overall admin can set any status, including "completed"
// without a signed report. Only technicians must have both signatures first
// (see updateServiceProgress).
const updateServiceStatus = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound("Service not found");

  const { status } = req.body;
  if (["assigned", "in_progress", "completed"].includes(status) && !service.technician) {
    throw ApiError.badRequest("Assign a technician first");
  }

  service.status = status;
  if (status === "in_progress" && !service.startedAt) service.startedAt = new Date();
  if (status === "completed") service.completedAt = service.completedAt || new Date();
  else service.completedAt = undefined;

  await service.save();
  res.json({ success: true, service });
});

// PATCH /api/services/:id/progress  (technician: start or complete their own job)
const updateServiceProgress = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, technician: req.user._id });
  if (!service) throw ApiError.notFound("Service not found");

  const { status, technicianNotes } = req.body;

  if (status === "in_progress") {
    if (service.status !== "assigned") throw ApiError.badRequest(`Cannot start a service that is ${service.status}`);
    service.startedAt = new Date();
  }

  if (status === "completed") {
    if (service.status !== "in_progress") throw ApiError.badRequest("Start the service before completing it");
    const report = await ServiceReport.findOne({ service: service._id });
    if (!report) throw ApiError.badRequest("Submit a service report before completing the service");
    if (!report.isFullySigned) {
      throw ApiError.badRequest("The service report must be signed by both the technician and the client");
    }
    service.completedAt = new Date();
  }

  service.status = status;
  if (technicianNotes !== undefined) service.technicianNotes = technicianNotes;
  await service.save();

  res.json({ success: true, service });
});

// DELETE /api/services/:id
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound("Service not found");

  if (await Invoice.exists({ service: service._id })) {
    throw ApiError.badRequest("This service has an invoice. Cancel the service instead of deleting it.");
  }
  if (await ServiceReport.exists({ service: service._id })) {
    throw ApiError.badRequest("This service has a report. Cancel the service instead of deleting it.");
  }

  await service.deleteOne();
  res.json({ success: true, message: "Service deleted" });
});

module.exports = {
  createService,
  getServices,
  getService,
  updateService,
  assignService,
  updateServiceStatus,
  updateServiceProgress,
  deleteService,
  findAccessibleService
};
