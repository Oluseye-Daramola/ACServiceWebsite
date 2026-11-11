const mongoose = require("mongoose");
const Transaction = require("../Models/Transaction");
const Invoice = require("../Models/Invoice");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { getPagination } = require("../Utils/pagination");
const { generateReceiptNo } = require("../Utils/generateInvoiceNo");

// Recomputes amountPaid from successful transactions; the Invoice model then
// sets status to "paid" (complete) once the full total has been received.
// Must run inside the same DB transaction as the payment change it follows.
const syncInvoicePayments = async (invoiceId, session) => {
  const [result] = await Transaction.aggregate([
    { $match: { invoice: new mongoose.Types.ObjectId(String(invoiceId)), status: "successful" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]).session(session);
  const invoice = await Invoice.findById(invoiceId).session(session);
  invoice.amountPaid = result ? Math.round(result.total * 100) / 100 : 0;
  await invoice.save({ session });
  return invoice;
};

// Payment changes run in a MongoDB transaction so the balance check, the
// transaction record and the invoice totals succeed or fail together.
// Two concurrent payments on one invoice cause a write conflict; MongoDB
// retries the loser, which then sees the new balance and is rejected.
// (Requires a replica set, e.g. MongoDB Atlas.)
const withDbTransaction = (fn) => mongoose.connection.transaction(fn);

const buildFilter = (query) => {
  const filter = {};
  for (const key of ["method", "status", "invoice", "client"]) {
    if (query[key]) filter[key] = query[key];
  }
  if (query.from || query.to) {
    filter.paidAt = {};
    if (query.from) filter.paidAt.$gte = new Date(query.from);
    if (query.to) filter.paidAt.$lte = new Date(query.to);
  }
  return filter;
};

// aggregate() does not cast strings to ObjectIds like find() does
const castFilter = (filter) => {
  const cast = { ...filter };
  for (const key of ["invoice", "client"]) {
    if (cast[key]) {
      if (!mongoose.isValidObjectId(cast[key])) throw ApiError.badRequest(`Invalid ${key} id`);
      cast[key] = new mongoose.Types.ObjectId(String(cast[key]));
    }
  }
  return cast;
};

// POST /api/transactions  (record a payment against an invoice)
const recordPayment = asyncHandler(async (req, res) => {
  const { invoiceId, ...fields } = req.body;
  let reference; // generated once, reused if the DB transaction is retried
  let transaction;
  let updatedInvoice;

  await withDbTransaction(async (session) => {
    const invoice = await Invoice.findById(invoiceId).session(session);
    if (!invoice) throw ApiError.notFound("Invoice not found");
    if (invoice.status === "cancelled") throw ApiError.badRequest("Cannot record payment on a cancelled invoice");
    if (invoice.status === "paid") throw ApiError.badRequest("This invoice is already fully paid");
    if (fields.amount > invoice.balance) {
      throw ApiError.badRequest(`Amount exceeds the outstanding balance of ${invoice.balance}`);
    }

    reference = reference || (await generateReceiptNo());
    [transaction] = await Transaction.create(
      [{ ...fields, reference, invoice: invoice._id, client: invoice.client, recordedBy: req.user._id }],
      { session }
    );

    updatedInvoice = await syncInvoicePayments(invoice._id, session);
  });

  res.status(201).json({
    success: true,
    message: updatedInvoice.status === "paid" ? "Payment recorded. Invoice is now fully paid." : "Payment recorded",
    transaction,
    invoice: updatedInvoice
  });
});

// GET /api/transactions?from=&to=&method=&status=&client=&invoice=
const getTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip, meta } = getPagination(req.query);
  const filter = buildFilter(req.query);

  const [transactions, total, [sum]] = await Promise.all([
    Transaction.find(filter)
      .populate("invoice", "invoiceNo total status")
      .populate("client", "name phone")
      .populate("recordedBy", "name")
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: { ...castFilter(filter), status: filter.status || "successful" } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ])
  ]);

  res.json({ success: true, data: transactions, totalAmount: sum ? sum.amount : 0, pagination: meta(total) });
});

// GET /api/transactions/summary?from=&to=
const getSummary = asyncHandler(async (req, res) => {
  const match = { ...castFilter(buildFilter(req.query)), status: "successful" };

  const [byMethod, byMonth, outstanding] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$method", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } }
    ]),
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
          amount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]),
    Invoice.aggregate([
      { $match: { status: { $in: ["unpaid", "partially_paid"] } } },
      { $group: { _id: null, amount: { $sum: "$balance" }, count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    totalReceived: byMethod.reduce((s, m) => s + m.amount, 0),
    byMethod,
    byMonth,
    outstanding: outstanding[0] || { amount: 0, count: 0 }
  });
});

// GET /api/transactions/:id
const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate("invoice")
    .populate("client", "name email phone")
    .populate("recordedBy reversedBy", "name");
  if (!transaction) throw ApiError.notFound("Transaction not found");
  res.json({ success: true, transaction });
});

// PATCH /api/transactions/:id/reverse  (undo a payment recorded in error)
const reverseTransaction = asyncHandler(async (req, res) => {
  let transaction;
  let invoice;

  await withDbTransaction(async (session) => {
    transaction = await Transaction.findById(req.params.id).session(session);
    if (!transaction) throw ApiError.notFound("Transaction not found");
    if (transaction.status === "reversed") throw ApiError.badRequest("Transaction is already reversed");

    transaction.status = "reversed";
    transaction.reversedBy = req.user._id;
    transaction.reversedAt = new Date();
    transaction.reversalReason = req.body.reason;
    await transaction.save({ session });

    invoice = await syncInvoicePayments(transaction.invoice, session);
  });

  res.json({ success: true, transaction, invoice });
});

module.exports = { recordPayment, getTransactions, getSummary, getTransaction, reverseTransaction };
