const User = require("../Models/User");
const Service = require("../Models/Service");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination, escapeRegex } = require("../Utils/pagination");

const findTechnician = async (id) => {
  const technician = await User.findOne({ _id: id, role: "technician" });
  if (!technician) throw ApiError.notFound("Technician not found");
  return technician;
};

// A technician with assigned / in-progress jobs can't be deactivated:
// they could no longer log in to finish them, leaving the jobs stuck.
const assertNoActiveJobs = async (technician) => {
  const activeJobs = await Service.countDocuments({
    technician: technician._id,
    status: { $in: ["assigned", "in_progress"] }
  });
  if (activeJobs) throw ApiError.badRequest(`Reassign this technician's ${activeJobs} active job(s) first`);
};

// POST /api/technicians
const createTechnician = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw ApiError.conflict("A user with this email already exists");

  const technician = await User.create({ ...req.body, role: "technician", createdBy: req.user._id });
  res.status(201).json({ success: true, technician });
});

// GET /api/technicians?search=&isActive=true
const getTechnicians = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = { role: "technician" };
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [technicians, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({ success: true, data: technicians, pagination: meta(total) });
});

// GET /api/technicians/:id  (includes job counts by status)
const getTechnician = asyncHandler(async (req, res) => {
  const technician = await findTechnician(req.params.id);

  const jobStats = await Service.aggregate([
    { $match: { technician: technician._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  res.json({
    success: true,
    technician,
    jobs: Object.fromEntries(jobStats.map((s) => [s._id, s.count]))
  });
});

// PATCH /api/technicians/:id
const updateTechnician = asyncHandler(async (req, res) => {
  const technician = await findTechnician(req.params.id);

  if (req.body.email && req.body.email !== technician.email && (await User.exists({ email: req.body.email }))) {
    throw ApiError.conflict("A user with this email already exists");
  }

  // Same rule as DELETE when this edit switches the account off (reactivating is always allowed)
  if (req.body.isActive === false && technician.isActive) await assertNoActiveJobs(technician);

  Object.assign(technician, req.body);
  await technician.save();
  res.json({ success: true, technician });
});

// PATCH /api/technicians/:id/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const technician = await findTechnician(req.params.id);
  technician.password = req.body.password;
  await technician.save();
  res.json({ success: true, message: "Password reset" });
});

// DELETE /api/technicians/:id  (soft delete: deactivates so job history is kept)
const deactivateTechnician = asyncHandler(async (req, res) => {
  const technician = await findTechnician(req.params.id);
  await assertNoActiveJobs(technician);

  technician.isActive = false;
  await technician.save();
  res.json({ success: true, message: "Technician deactivated", technician });
});

module.exports = {
  createTechnician,
  getTechnicians,
  getTechnician,
  updateTechnician,
  resetPassword,
  deactivateTechnician
};
