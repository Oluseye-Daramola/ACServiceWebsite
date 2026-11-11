// Preloaded into every test file's process (`--require` in package.json), before any app code.
// dotenv never overrides variables that already exist, so everything set here
// wins over the real .env. Secrets/services are blanked or faked so tests can
// never touch real email, Cloudinary or your Atlas database.
const os = require("os");
const path = require("path");

Object.assign(process.env, {
  DOTENV_CONFIG_QUIET: "true",
  NODE_ENV: "test",
  TZ: "UTC", // like a cloud server; PDFs must still show Lagos time
  MONGO_URI: "set-per-test-file-in-db.js",
  JWT_SECRET: "test-jwt-secret",
  JWT_EXPIRES_IN: "1h",
  BCRYPT_ROUNDS: "4", // fast hashing for tests only (real default is 12)
  PORT: "0",
  CLIENT_URL: "http://localhost:5173",
  API_URL: "http://localhost:5000",
  UPLOAD_DIR: path.join(os.tmpdir(), "ac-website-test-uploads"),

  COMPANY_NAME: "Test AC Services",
  COMPANY_EMAIL: "info@test-ac.com",
  COMPANY_PHONE: "+234 800 000 0000",
  COMPANY_ADDRESS: "Lagos, Nigeria",
  CURRENCY: "NGN",
  TIMEZONE: "Africa/Lagos",
  DEFAULT_COUNTRY_CODE: "234",

  // Fake SMTP so email code paths run; Tests/mocks/nodemailer.js captures the mail
  SMTP_HOST: "smtp.test.invalid",
  SMTP_PORT: "587",
  SMTP_USER: "bot@test-ac.com",
  SMTP_PASS: "not-a-real-password",
  EMAIL_FROM: "bot@test-ac.com",
  ENQUIRY_NOTIFY_EMAILS: "",

  // Blank = files are saved locally (to UPLOAD_DIR above), never to Cloudinary
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: ""
});

// Never send real email: swap nodemailer's transport for the fake outbox.
// (Services/emailService.js creates its transport lazily, so this is in place first.)
require("nodemailer").createTransport = require("../mocks/nodemailer").createTransport;
