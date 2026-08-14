import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { User } from "@/lib/db";

export interface Session {
  userId: number;
  username: string;
}

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const JWT_ISSUER = "todo-app";
const JWT_AUDIENCE = "todo-app";

function getSessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }

    return new TextEncoder().encode("dev-only-change-me");
  }

  return new TextEncoder().encode(secret);
}

function normalizePayload(payload: Record<string, unknown>): Session | null {
  const userId = payload.userId;
  const username = payload.username;

  if (
    typeof userId !== "number" ||
    !Number.isInteger(userId) ||
    userId <= 0 ||
    typeof username !== "string" ||
    username.length === 0
  ) {
    return null;
  }

  return { userId, username };
}

export async function createSession(user: User): Promise<void> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function getSessionFromToken(
  token: string | undefined
): Promise<Session | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    return normalizePayload(payload);
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromToken(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
