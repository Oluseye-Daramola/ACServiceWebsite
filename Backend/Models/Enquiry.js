const mongoose = require("mongoose");

const SERVICE_TYPES = ["installation", "repair", "maintenance", "gas_refill", "inspection", "other"];
const ENQUIRY_STATUSES = ["new", "contacted", "converted", "closed"];

const enquirySchema = new mongoose.Schema(
  {
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        required: true, 
        trim: true 
    },
    address: { 
        type: String, 
        trim: true 
    },
    serviceType: { 
        type: String, 
        enum: SERVICE_TYPES, 
        default: "other" 
    },
    message: { 
        type: String, 
        required: true, 
        trim: true 
    },
    preferredDate: Date,
    status: { 
        type: String, 
        enum: ENQUIRY_STATUSES, 
        default: "new" 
    },
    adminNotes: { 
        type: String, 
        trim: true 
    },
    client: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Client" 
    },
    service: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Service" 
    },
    convertedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    },
    convertedAt: Date
  },
  { timestamps: true }
);

const Enquiry = mongoose.model("Enquiry", enquirySchema);

module.exports = Enquiry;
module.exports.SERVICE_TYPES = SERVICE_TYPES;
module.exports.ENQUIRY_STATUSES = ENQUIRY_STATUSES;
