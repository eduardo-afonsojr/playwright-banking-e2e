/**
 * Runs before each test file's modules load (Jest `setupFiles`).
 *
 * The app reads MONGODB_DB once at import time, so the test database name
 * must be set before anything imports the db layer. Worker-scoped names let
 * integration test files run in parallel: files in different Jest workers
 * write to different databases, files in the same worker run sequentially.
 */
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017";
process.env.MONGODB_DB = `banking_test_${process.env.JEST_WORKER_ID ?? "1"}`;
