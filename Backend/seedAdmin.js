// Creates the first admin account. Run with: npm run seed
require("./Config/env");
const mongoose = require("mongoose");
const connectDB = require("./Config/db");
const User = require("./Models/User");

const { ADMIN_NAME = "Admin", ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE } = process.env;

const seedAdmin = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.");
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`A user with ${ADMIN_EMAIL} already exists (role: ${existing.role}). Nothing to do.`);
  } else {
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      role: "admin"
    });
    console.log(`Admin created: ${ADMIN_EMAIL}`);
  }

  await mongoose.connection.close();
};

seedAdmin().catch(async (err) => {
  console.error("Seeding failed:", err.message);
  await mongoose.connection.close();
  process.exit(1);
});
