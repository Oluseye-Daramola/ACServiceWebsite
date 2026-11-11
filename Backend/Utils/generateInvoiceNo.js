const Counter = require("../Models/Counter");

// Atomically increments a named counter and returns a formatted number,
// e.g. nextSequence("invoice", "INV") -> "INV-2026-00001"
const nextSequence = async (name, prefix) => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { name: `${name}-${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return `${prefix}-${year}-${String(counter.seq).padStart(5, "0")}`;
};

const generateInvoiceNo = () => nextSequence("invoice", "INV");
const generateServiceNo = () => nextSequence("service", "SRV");
const generateReceiptNo = () => nextSequence("transaction", "TXN");

module.exports = { nextSequence, generateInvoiceNo, generateServiceNo, generateReceiptNo };
