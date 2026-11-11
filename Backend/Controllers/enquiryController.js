const Enquiry = require("../Models/Enquiry");
const Client = require("../Models/Client");
const Service = require("../Models/Service");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination, escapeRegex } = require("../Utils/pagination");
const { generateServiceNo } = require("../Utils/generateInvoiceNo");
const { acknowledgeEnquiry, notifyAdminsNewEnquiry } = require("../Services/emailService");
const { assignTechnician, notifyTechnicianAssigned } = require("../Services/assignment");

// POST /api/enquiries  (public contact form)
const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.create(req.body);
  // Background emails: not awaited, so the customer gets an instant response
  acknowledgeEnquiry(enquiry);
  notifyAdminsNewEnquiry(enquiry);
  res.status(201).json({ success: true, message: "Thank you! We will contact you shortly.", enquiryId: enquiry._id });
});

// GET /api/enquiries?status=new&search=
const getEnquiries = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { message: rx }];
  }

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Enquiry.countDocuments(filter)
  ]);

  res.json({ success: true, data: enquiries, pagination: meta(total) });
});

// GET /api/enquiries/:id
const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id).populate("client").populate("service", "serviceNo title status");
  if (!enquiry) throw ApiError.notFound("Enquiry not found");
  res.json({ success: true, enquiry });
});

// PATCH /api/enquiries/:id/status
const updateEnquiryStatus = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound("Enquiry not found");
  if (enquiry.status === "converted") throw ApiError.badRequest("This enquiry has already been converted to a service");

  Object.assign(enquiry, req.body);
  await enquiry.save();
  res.json({ success: true, enquiry });
});

// POST /api/enquiries/:id/convert  -> creates (or reuses) a client and a service
const convertEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound("Enquiry not found");
  if (enquiry.status === "converted") throw ApiError.badRequest("This enquiry has already been converted");

  const { clientId, technicianId, ...serviceFields } = req.body;

  let client;
  let clientCreated = false;
  if (clientId) {
    client = await Client.findById(clientId);
    if (!client) throw ApiError.notFound("Client not found");
  } else {
    client = await Client.findOne({ $or: [{ email: enquiry.email }, { phone: enquiry.phone }] });
    if (!client) {
      client = await Client.create({
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        address: enquiry.address,
        createdBy: req.user._id
      });
      clientCreated = true;
    }
  }

  const service = new Service({
    serviceNo: await generateServiceNo(),
    client: client._id,
    enquiry: enquiry._id,
    title: serviceFields.title || `${(serviceFields.serviceType || enquiry.serviceType).replace("_", " ")} for ${client.name}`,
    serviceType: serviceFields.serviceType || enquiry.serviceType,
    description: serviceFields.description || enquiry.message,
    address: serviceFields.address || enquiry.address || client.address,
    scheduledDate: serviceFields.scheduledDate || enquiry.preferredDate,
    priority: serviceFields.priority,
    adminNotes: serviceFields.adminNotes,
    createdBy: req.user._id
  });

  const technician = technicianId ? await assignTechnician(service, technicianId) : null;
  await service.save();

  enquiry.status = "converted";
  enquiry.client = client._id;
  enquiry.service = service._id;
  enquiry.convertedBy = req.user._id;
  enquiry.convertedAt = new Date();
  await enquiry.save();

  if (technician) notifyTechnicianAssigned(technician, service);

  res.status(201).json({ success: true, clientCreated, client, service, enquiry });
});

// DELETE /api/enquiries/:id
const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound("Enquiry not found");
  if (enquiry.status === "converted") throw ApiError.badRequest("Converted enquiries cannot be deleted");

  await enquiry.deleteOne();
  res.json({ success: true, message: "Enquiry deleted" });
});

module.exports = { createEnquiry, getEnquiries, getEnquiry, updateEnquiryStatus, convertEnquiry, deleteEnquiry };
