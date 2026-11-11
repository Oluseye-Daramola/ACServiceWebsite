const mongoose = require("mongoose");
const { SERVICE_TYPES } = require("./Enquiry");

const SERVICE_STATUSES = ["pending", "assigned", "in_progress", "completed", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

const acUnitSchema = new mongoose.Schema(
  {
    brand: String,
    model: String,
    type: { type: String }, // split, window, standing, cassette, central...
    capacity: String, // e.g. "1.5HP"
    location: String // e.g. "Living room"
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    serviceNo: { 
        type: String, 
        unique: true 
    },
    client: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Client", 
        required: true 
    },
    enquiry: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Enquiry" 
    },
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    serviceType: { 
        type: String, 
        enum: SERVICE_TYPES, 
        required: true 
    },
    description: { 
        type: String, 
        trim: true 
    },
    address: { 
        type: String, 
        trim: true 
    },
    acUnits: [acUnitSchema],
    scheduledDate: Date,
    priority: { 
        type: String, 
        enum: PRIORITIES, 
        default: "normal" 
    },
    status: { 
        type: String, 
        enum: SERVICE_STATUSES, 
        default: "pending" 
    },
    technician: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    },
    assignedAt: Date,
    startedAt: Date,
    completedAt: Date,
    adminNotes: { 
        type: String, 
        trim: true 
    },
    technicianNotes: { 
        type: String, 
        trim: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }
  },
  { timestamps: true }
);

serviceSchema.index({ technician: 1, status: 1 });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
module.exports.SERVICE_STATUSES = SERVICE_STATUSES;
module.exports.PRIORITIES = PRIORITIES;
