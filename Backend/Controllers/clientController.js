const Client = require("../Models/Client");
const Service = require("../Models/Service");
const Invoice = require("../Models/Invoice");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination, escapeRegex } = require("../Utils/pagination");

// POST /api/clients
const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, client });
});

// GET /api/clients?search=
const getClients = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { city: rx }];
  }

  const [clients, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Client.countDocuments(filter)
  ]);

  res.json({ success: true, data: clients, pagination: meta(total) });
});

// GET /api/clients/:id  (with service and invoice history)
const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw ApiError.notFound("Client not found");

  const [services, invoices] = await Promise.all([
    Service.find({ client: client._id }).populate("technician", "name phone").sort({ createdAt: -1 }),
    Invoice.find({ client: client._id }).select("invoiceNo total balance status issueDate").sort({ createdAt: -1 })
  ]);

  res.json({ success: true, client, services, invoices });
});

// PATCH /api/clients/:id
const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true });
  if (!client) throw ApiError.notFound("Client not found");
  res.json({ success: true, client });
});

// DELETE /api/clients/:id  (only clients with no service history)
const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw ApiError.notFound("Client not found");

  if (await Service.exists({ client: client._id })) {
    throw ApiError.badRequest("Cannot delete a client that has services on record");
  }

  await client.deleteOne();
  res.json({ success: true, message: "Client deleted" });
});

module.exports = { createClient, getClients, getClient, updateClient, deleteClient };
