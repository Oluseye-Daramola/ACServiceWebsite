const mongoose = require("mongoose");

const REPORT_STATUSES = ["draft", "awaiting_signatures", "signed"];

const signatureSchema = new mongoose.Schema(
  {
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    imageUrl: { 
        type: String, 
        required: true 
    },
    signedAt: { 
        type: Date, 
        default: Date.now 
    }
  },
  { _id: false }
);

const serviceReportSchema = new mongoose.Schema(
  {
    service: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Service", 
        required: true, 
        unique: true 
    },
    technician: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    arrivalTime: Date,
    departureTime: Date,
    findings: { 
        type: String, 
        required: true, 
        trim: true 
    },
    workDone: { 
        type: String, 
        required: true, 
        trim: true 
    },
    partsUsed: [
      {
        _id: false,
        name: { 
            type: String, 
            required: true 
        },
        quantity: { 
            type: Number, 
            default: 1, min: 1 
        }
      }
    ],
    recommendations: { type: String, trim: true },
    photos: [String],
    technicianSignature: signatureSchema,
    clientSignature: signatureSchema,
    status: { type: String, enum: REPORT_STATUSES, default: "draft" }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

serviceReportSchema.virtual("isFullySigned").get(function () {
  return Boolean(this.technicianSignature && this.clientSignature);
});

// Keep status in sync with the signatures present
serviceReportSchema.pre("save", function () {
  if (this.technicianSignature && this.clientSignature) this.status = "signed";
  else if (this.technicianSignature || this.clientSignature) this.status = "awaiting_signatures";
  else this.status = "draft";
});

const ServiceReport = mongoose.model("ServiceReport", serviceReportSchema);

module.exports = ServiceReport;
module.exports.REPORT_STATUSES = REPORT_STATUSES;
