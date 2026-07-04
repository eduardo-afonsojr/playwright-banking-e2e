/**
 * Setup project that runs once before every browser project:
 * 1. resets the database to the seeded state, and
 * 2. signs in through the real login API, persisting the session cookie as
 *    Playwright storage state.
 *
 * Authenticated specs then start with a valid session and never touch the
 * login form, keeping them fast and focused. The login specs themselves opt
 * out of the stored state to exercise the form for real.
 */
import { test as setup, expect } from "@playwright/test";
import {
  seedDatabase,
  SEED_USER,
  STORAGE_STATE_PATH,
} from "../fixtures/test-data";

setup("seed database and authenticate", async ({ request }) => {
  await seedDatabase();

  const response = await request.post("/api/auth/login", {
    data: {
      username: SEED_USER.username,
      password: SEED_USER.password,
    },
  });
  expect(response.ok(), "seed user should be able to log in").toBeTruthy();

  await request.storageState({ path: STORAGE_STATE_PATH });
});
