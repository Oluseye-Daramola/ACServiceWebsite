const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

clientSchema.index({ email: 1 });
clientSchema.index({ phone: 1 });

module.exports = mongoose.model("Client", clientSchema);
