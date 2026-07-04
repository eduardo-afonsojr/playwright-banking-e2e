/**
 * Integration tests for POST /api/auth/login against a real MongoDB.
 * Route handlers are called directly as functions; see tests/helpers/api.ts.
 */
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { seedDatabase, SEED_USER } from "@/lib/db/seed";
import { sessionsCollection } from "@/lib/db/collections";
import { jsonRequest } from "../helpers/api";
import { closeDbClient } from "../helpers/db";

beforeAll(async () => {
  await seedDatabase();
});

afterAll(async () => {
  await closeDbClient();
});

describe("POST /api/auth/login", () => {
  it("returns the user and sets a session cookie for valid credentials", async () => {
    const response = await loginRoute(
      jsonRequest("/api/auth/login", "POST", {
        username: SEED_USER.username,
        password: SEED_USER.password,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toEqual({
      username: SEED_USER.username,
      fullName: SEED_USER.fullName,
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    expect(setCookie.toLowerCase()).toContain("httponly");

    // The session actually exists in the database.
    const token = /session_token=([^;]+)/.exec(setCookie)?.[1];
    const sessions = await sessionsCollection();
    expect(await sessions.findOne({ token })).not.toBeNull();
  });

  it("rejects a wrong password with 401 and no cookie", async () => {
    const response = await loginRoute(
      jsonRequest("/api/auth/login", "POST", {
        username: SEED_USER.username,
        password: "wrong-password",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.json();
    expect(body.error).toBe("Invalid username or password.");
  });

  it("rejects an unknown user with 401 (same message as wrong password)", async () => {
    const response = await loginRoute(
      jsonRequest("/api/auth/login", "POST", {
        username: "nobody",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    // Identical message for unknown user and wrong password: the endpoint
    // must not leak which usernames exist.
    expect(body.error).toBe("Invalid username or password.");
  });

  it("rejects missing fields with 400", async () => {
    const response = await loginRoute(
      jsonRequest("/api/auth/login", "POST", { username: SEED_USER.username }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body with 400", async () => {
    const response = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});
