const Enquiry = require("../Models/Enquiry");
const Service = require("../Models/Service");
const Client = require("../Models/Client");
const User = require("../Models/User");
const Invoice = require("../Models/Invoice");
const Transaction = require("../Models/Transaction");
const ServiceReport = require("../Models/ServiceReport");
const asyncHandler = require("../Utils/asyncHandler");

const countBy = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
};

// GET /api/dashboard  (shape depends on the role)
const getDashboard = asyncHandler(async (req, res) => {
  if (req.user.role === "technician") {
    const techId = req.user._id;
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));

    const [jobs, upcoming, pendingSignatures] = await Promise.all([
      countBy(Service, "status", { technician: techId }),
      Service.find({ technician: techId, status: { $in: ["assigned", "in_progress"] }, scheduledDate: { $gte: startOfDay } })
        .populate("client", "name phone address")
        .sort({ scheduledDate: 1 })
        .limit(10),
      ServiceReport.countDocuments({ technician: techId, status: { $ne: "signed" } })
    ]);

    return res.json({ success: true, role: "technician", jobs, upcoming, pendingSignatures });
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [enquiries, services, clients, technicians, invoices, revenue, recentEnquiries, unassigned] = await Promise.all([
    countBy(Enquiry, "status"),
    countBy(Service, "status"),
    Client.countDocuments(),
    User.countDocuments({ role: "technician", isActive: true }),
    countBy(Invoice, "status"),
    Transaction.aggregate([
      { $match: { status: "successful" } },
      {
        $group: {
          _id: null,
          allTime: { $sum: "$amount" },
          thisMonth: { $sum: { $cond: [{ $gte: ["$paidAt", startOfMonth] }, "$amount", 0] } }
        }
      }
    ]),
    Enquiry.find({ status: "new" }).sort({ createdAt: -1 }).limit(5),
    Service.find({ status: "pending" }).populate("client", "name").sort({ createdAt: -1 }).limit(5)
  ]);

  const outstanding = await Invoice.aggregate([
    { $match: { status: { $in: ["unpaid", "partially_paid"] } } },
    { $group: { _id: null, amount: { $sum: "$balance" } } }
  ]);

  res.json({
    success: true,
    role: "admin",
    counts: { enquiries, services, invoices, clients, activeTechnicians: technicians },
    revenue: {
      allTime: revenue[0] ? revenue[0].allTime : 0,
      thisMonth: revenue[0] ? revenue[0].thisMonth : 0,
      outstanding: outstanding[0] ? outstanding[0].amount : 0
    },
    recentEnquiries,
    unassignedServices: unassigned
  });
});

module.exports = { getDashboard };
