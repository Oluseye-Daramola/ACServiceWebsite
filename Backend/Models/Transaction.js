const mongoose = require("mongoose");

const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "pos", "other"];

const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentRef: { type: String, trim: true }, // bank/POS reference supplied by the payer
    status: { type: String, enum: ["successful", "reversed"], default: "successful" },
    paidAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reversedAt: Date,
    reversalReason: String
  },
  { timestamps: true }
);

transactionSchema.index({ invoice: 1 });
transactionSchema.index({ paidAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
