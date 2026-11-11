const User = require("../Models/User");
const ApiError = require("../Utils/apiError");
const { notifyTechnicianAssigned } = require("./emailService");

// Assigns an active technician to a service document (caller saves it)
const assignTechnician = async (service, technicianId) => {
  const technician = await User.findOne({ _id: technicianId, role: "technician" });
  if (!technician) throw ApiError.notFound("Technician not found");
  if (!technician.isActive) throw ApiError.badRequest("Technician account is deactivated");
  if (["completed", "cancelled"].includes(service.status)) {
    throw ApiError.badRequest(`Cannot assign a technician to a ${service.status} service`);
  }

  service.technician = technician._id;
  service.assignedAt = new Date();
  if (service.status === "pending") service.status = "assigned";
  return technician;
};

module.exports = { assignTechnician, notifyTechnicianAssigned };
