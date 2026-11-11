require("dotenv").config();

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Public URL of this API, used to build shareable invoice PDF links
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,

  company: {
    name: process.env.COMPANY_NAME || "AC Services Ltd",
    email: process.env.COMPANY_EMAIL || "",
    phone: process.env.COMPANY_PHONE || "",
    address: process.env.COMPANY_ADDRESS || "",
    currency: process.env.CURRENCY || "NGN",
    // Time zone for dates/times printed on PDFs (IANA name)
    timezone: process.env.TIMEZONE || "Africa/Lagos"
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER
  },

  // Optional: who gets new-enquiry alerts (comma separated). Empty = all active admins.
  enquiryNotifyEmails: (process.env.ENQUIRY_NOTIFY_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),

  cloudinaryEnabled: Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  )
};
