// Loaded once by `node --test --test-global-setup=...` (see "test" in package.json).
// Starts one in-memory MongoDB replica set for the whole run. A replica set (not a
// plain server) is required because payments use MongoDB transactions.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

// Must match UPLOAD_DIR in Tests/setup/env.js
const TEST_UPLOAD_DIR = path.join(os.tmpdir(), "ac-website-test-uploads");

let replSet;

async function globalSetup() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ launchTimeout: 120000 }] // first start on Windows can be slow
  });
  process.env.TEST_MONGO_URI = replSet.getUri(); // inherited by every test file's process
}

async function globalTeardown() {
  // On Windows a harmless "MongoNetworkError: read ECONNRESET" may be printed while the
  // test database shuts down. It happens after all tests finish and doesn't affect results.
  if (replSet) await replSet.stop();
  // Remove photos/signatures uploaded during the run
  fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
}

module.exports = { globalSetup, globalTeardown };
