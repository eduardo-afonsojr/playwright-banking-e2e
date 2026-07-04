/**
 * Shared helpers for API route integration tests. Route handlers are plain
 * functions (Request) => Response, so tests call them directly — no HTTP
 * server involved — while the data layer talks to a real MongoDB.
 */
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { SEED_USER } from "@/lib/db/seed";

export function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Logs in as the seed user and returns the session token from the cookie. */
export async function loginAsSeedUser(): Promise<string> {
  const response = await loginRoute(
    jsonRequest("/api/auth/login", "POST", {
      username: SEED_USER.username,
      password: SEED_USER.password,
    }),
  );
  if (response.status !== 200) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = /session_token=([^;]+)/.exec(setCookie);
  if (!match) {
    throw new Error("Login response did not set a session cookie");
  }
  return match[1];
}
