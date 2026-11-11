const { port } = require("./Config/env"); // loads .env first
const mongoose = require("mongoose");
const connectDB = require("./Config/db");
const app = require("./app");
const logger = require("./Utils/logger");

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});

const start = async () => {
  await connectDB();

  const server = app.listen(port, () => logger.info(`Server running on http://localhost:${port}`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled rejection:", err);
    server.close(() => process.exit(1));
  });
};

start();
