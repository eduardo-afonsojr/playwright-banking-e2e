import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Every spec file runs in parallel; tests within a file too.
  fullyParallel: true,
  // Guard against accidentally committed test.only.
  forbidOnly: !!process.env.CI,
  // One retry in CI so the trace-on-first-retry artifact gets captured for
  // genuinely flaky failures; locally a failure should fail loudly.
  retries: process.env.CI ? 1 : 0,
  // CI runs sharded, so each shard emits a blob report; a follow-up CI job
  // merges the blobs into the single HTML report published as an artifact.
  reporter: process.env.CI
    ? [["list"], ["blob"], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // Session cookie captured by the auth setup project. Specs that need
        // an anonymous browser (e.g. login) override this locally.
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // CI builds the app first and runs the production server; locally the
    // dev server is reused if one is already running.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
