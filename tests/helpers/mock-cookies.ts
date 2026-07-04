/**
 * Test double for next/headers cookies(), which only works inside a real
 * Next.js request scope. Integration tests set `currentSessionToken` after
 * logging in through the login route, and the route handlers under test read
 * it back through the mocked cookies() just like they would in production.
 *
 * Used together with (in the test file):
 *
 *   jest.mock("next/headers", () => ({
 *     cookies: () => require("../helpers/mock-cookies").mockCookieStore(),
 *   }));
 */
import { SESSION_COOKIE } from "@/lib/auth/session";

let currentSessionToken: string | undefined;

export function setSessionToken(token: string | undefined): void {
  currentSessionToken = token;
}

export function mockCookieStore() {
  return {
    get(name: string) {
      if (name === SESSION_COOKIE && currentSessionToken) {
        return { name, value: currentSessionToken };
      }
      return undefined;
    },
  };
}
