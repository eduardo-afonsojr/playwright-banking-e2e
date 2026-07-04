import nextJest from "next/jest.js";

// next/jest wires up SWC transpilation, tsconfig path aliases (@/...) and
// Next.js-specific module handling (next/server, next/headers, CSS, etc.).
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  // Node by default (unit + API integration tests). Component tests opt
  // into jsdom per-file with a `@jest-environment jsdom` docblock.
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  // Playwright owns everything under e2e/.
  testPathIgnorePatterns: ["<rootDir>/e2e/", "<rootDir>/node_modules/"],
  // Gives each Jest worker its own MongoDB database name so integration
  // test files can run in parallel without stepping on each other.
  setupFiles: ["<rootDir>/tests/helpers/setup-env.ts"],
  clearMocks: true,
};

export default createJestConfig(config);
