const mongoose = require("mongoose");

const INVOICE_STATUSES = ["unpaid", "partially_paid", "paid", "cancelled"];

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, min: 0 }
  },
  { _id: false }
);

const round = (n) => Math.round(n * 100) / 100;

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    items: {
      type: [itemSchema],
      validate: { validator: (v) => v.length > 0, message: "An invoice needs at least one item" }
    },
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 }, // percent, e.g. 7.5
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    // "paid" is the completed state: set automatically once amountPaid >= total
    status: { type: String, enum: INVOICE_STATUSES, default: "unpaid" },
    issueDate: { type: Date, default: Date.now },
    dueDate: Date,
    paidAt: Date,
    notes: { type: String, trim: true },
    sentLog: [
      {
        _id: false,
        channel: { type: String, enum: ["email", "whatsapp"] },
        to: String,
        sentAt: { type: Date, default: Date.now }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  // optimisticConcurrency: a save fails with VersionError if the invoice changed
  // since it was loaded (e.g. a payment landed while it was being edited/cancelled)
  { timestamps: true, optimisticConcurrency: true }
);

// Recalculate totals and payment status before every save
invoiceSchema.pre("validate", function () {
  this.items.forEach((item) => {
    item.amount = round(item.quantity * item.unitPrice);
  });
  this.subtotal = round(this.items.reduce((sum, i) => sum + i.amount, 0));
  this.taxAmount = round(((this.subtotal - this.discount) * this.taxRate) / 100);
  this.total = round(Math.max(this.subtotal - this.discount + this.taxAmount, 0));
  this.balance = round(Math.max(this.total - this.amountPaid, 0));

  if (this.status === "cancelled") return;

  if (this.amountPaid <= 0) this.status = "unpaid";
  else if (this.amountPaid < this.total) this.status = "partially_paid";
  else this.status = "paid";

  if (this.status === "paid") this.paidAt = this.paidAt || new Date();
  else this.paidAt = undefined;
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
module.exports.INVOICE_STATUSES = INVOICE_STATUSES;
