const { before, beforeEach, after } = require("node:test");
const mongoose = require("mongoose");
const { outbox } = require("../mocks/nodemailer");

/**
 * Call once at the top of every test file:
 *   useTestDb();
 * Gives the file its own database, wipes it (and the fake outbox) before each
 * test, and drops it at the end.
 */
const useTestDb = () => {
  // Load every model so collections and unique indexes exist up front
  // (MongoDB transactions can't create indexes on the fly).
  require("../../app");

  before(async () => {
    if (!process.env.TEST_MONGO_URI) throw new Error("Run the tests with `npm test` (starts the test database)");
    const dbName = `test_${process.pid}_${Date.now()}`;
    await mongoose.connect(process.env.TEST_MONGO_URI.replace(/\/?(\?|$)/, `/${dbName}$1`));
    for (const model of Object.values(mongoose.models)) {
      await model.createCollection();
      await model.init();
    }
  });

  beforeEach(async () => {
    outbox.reset();
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
};

module.exports = { useTestDb };
