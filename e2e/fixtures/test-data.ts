/**
 * Single source of truth for test data: everything comes from the seed
 * module, so the specs can never drift from what the seed script creates.
 */
export {
  SEED_USER,
  SEED_ACCOUNTS,
  SEED_TRANSFERS,
  seedDatabase,
} from "../../src/lib/db/seed";

/** Storage state file written by the auth setup project. */
export const STORAGE_STATE_PATH = "e2e/.auth/user.json";
