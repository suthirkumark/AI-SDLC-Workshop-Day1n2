import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { authenticatorDB, userDB } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveChallenge } from "@/lib/webauthn-challenge-store";

const registerOptionsSchema = z.object({
  username: z.string().trim().min(1).max(64)
});

function getRpConfig(): { rpName: string; rpID: string } {
  return {
    rpName: process.env.RP_NAME ?? "Todo App",
    rpID: process.env.RP_ID ?? "localhost"
  };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (
    !checkRateLimit({
      key: `auth:register-options:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000
    })
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = registerOptionsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const username = parsed.data.username;
  const existingUser = userDB.findByUsername(username);
  const session = await getSession();

  if (existingUser && session?.userId !== existingUser.id) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const userAuthenticators = existingUser
    ? authenticatorDB.findByUserId(existingUser.id)
    : [];

  const options = await generateRegistrationOptions({
    ...getRpConfig(),
    userName: username,
    userDisplayName: username,
    attestationType: "none",
    excludeCredentials: userAuthenticators.map((authenticator) => ({
      id: authenticator.credential_id
    }))
  });

  saveChallenge("registration", username, options.challenge);
  return NextResponse.json(options);
}
