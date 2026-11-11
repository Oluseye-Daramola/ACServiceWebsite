// Fake nodemailer transport used by the whole test suite (installed by Tests/setup/env.js).
// Nothing is ever sent; messages are collected in `outbox` for assertions.
const messages = [];
let mode = "ok"; // "ok" | "fail" | "slow"

const outbox = {
  messages,
  reset() {
    messages.length = 0;
    mode = "ok";
  },
  fail() {
    mode = "fail";
  },
  slow() {
    mode = "slow";
  },
  find(predicate) {
    return messages.find(predicate);
  },
  // Background emails are fire-and-forget; give them a moment to land
  async waitFor(predicate, timeoutMs = 2000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const found = messages.find(predicate);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 20));
    }
    return undefined;
  }
};

const createTransport = () => ({
  sendMail: async (message) => {
    if (mode === "slow") await new Promise((r) => setTimeout(r, 3000));
    if (mode === "fail") throw new Error("SMTP connection refused");
    messages.push(message);
    return { messageId: `test-${messages.length}` };
  }
});

module.exports = { createTransport, outbox };
