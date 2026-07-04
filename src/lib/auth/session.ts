import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import {
  sessionsCollection,
  usersCollection,
} from "@/lib/db/collections";
import type { UserDocument } from "@/types/models";

export const SESSION_COOKIE = "session_token";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(userId: ObjectId): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const sessions = await sessionsCollection();
  const now = new Date();
  await sessions.insertOne({
    _id: new ObjectId(),
    token,
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const sessions = await sessionsCollection();
  await sessions.deleteOne({ token });
}

/**
 * Resolves the authenticated user from the session cookie.
 * Returns null when there is no cookie, the token is unknown, or expired.
 */
export async function getAuthenticatedUser(): Promise<UserDocument | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const sessions = await sessionsCollection();
  const session = await sessions.findOne({
    token,
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    return null;
  }

  const users = await usersCollection();
  return users.findOne({ _id: session.userId });
}
