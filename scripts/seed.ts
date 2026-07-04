/** CLI wrapper around the shared seed logic: `npm run seed`. */
import "dotenv/config";
import { seedDatabase, SEED_USER, SEED_ACCOUNTS } from "../src/lib/db/seed";

seedDatabase()
  .then(({ dbName, transactionCount }) => {
    console.log(`Seeded database "${dbName}":`);
    console.log(`  user: ${SEED_USER.username} / ${SEED_USER.password}`);
    console.log(
      `  accounts: ${SEED_ACCOUNTS.checking.name} ($${SEED_ACCOUNTS.checking.balance}), ` +
        `${SEED_ACCOUNTS.savings.name} ($${SEED_ACCOUNTS.savings.balance})`,
    );
    console.log(`  transactions: ${transactionCount}`);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
