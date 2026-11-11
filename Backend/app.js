const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { clientUrl, nodeEnv } = require("./Config/env");
const { apiLimiter } = require("./Middleware/ratelimiter");
const { notFound, errorHandler } = require("./Middleware/errorHandler");
const { UPLOAD_DIR } = require("./Services/storage");

const authRoutes = require("./Routes/authRoutes");
const enquiryRoutes = require("./Routes/enquiryRoutes");
const clientRoutes = require("./Routes/clientRoutes");
const technicianRoutes = require("./Routes/technicianRoutes");
const serviceRoutes = require("./Routes/serviceRoutes");
const reportRoutes = require("./Routes/reportRoutes");
const invoiceRoutes = require("./Routes/invoiceRoutes");
const transactionRoutes = require("./Routes/transactionRoutes");
const dashboardRoutes = require("./Routes/dashboardRoutes");

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: clientUrl.split(",").map((u) => u.trim()), credentials: true }));
app.use(express.json({ limit: "5mb" })); // signatures arrive as base64 images
app.use(express.urlencoded({ extended: true }));
if (nodeEnv !== "test") app.use(morgan("dev"));

// Locally stored uploads (signatures, report photos) when Cloudinary isn't configured
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok", time: new Date().toISOString() }));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
