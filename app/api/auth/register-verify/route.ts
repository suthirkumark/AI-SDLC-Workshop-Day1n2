import {
    type RegistrationResponseJSON,
    verifyRegistrationResponse
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSession, getSession } from "@/lib/auth";
import { authenticatorDB, userDB } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeChallenge } from "@/lib/webauthn-challenge-store";

const registerVerifySchema = z.object({
  username: z.string().trim().min(1).max(64),
  response: z.unknown()
});

function getRpConfig(): { expectedOrigin: string; expectedRPID: string } {
  return {
    expectedOrigin: process.env.RP_ORIGIN ?? "http://localhost:3000",
    expectedRPID: process.env.RP_ID ?? "localhost"
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
      key: `auth:register-verify:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000
    })
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = registerVerifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const username = parsed.data.username;
  const response = parsed.data.response as RegistrationResponseJSON;

  const expectedChallenge = consumeChallenge("registration", username);
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "Registration challenge expired. Please retry." },
      { status: 400 }
    );
  }

  const existingUser = userDB.findByUsername(username);
  const session = await getSession();

  if (existingUser && session?.userId !== existingUser.id) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    ...getRpConfig(),
    requireUserVerification: true
  }).catch(() => null);

  if (!verification?.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const {
    credential: { id, publicKey, counter }
  } = verification.registrationInfo;

  if (authenticatorDB.findByCredentialId(id)) {
    return NextResponse.json(
      { error: "Authenticator already registered" },
      { status: 409 }
    );
  }

  const user = existingUser ?? userDB.create(username);

  authenticatorDB.create({
    user_id: user.id,
    credential_id: id,
    credential_public_key: publicKey,
    counter: counter ?? 0
  });

  await createSession(user);
  return NextResponse.json({ success: true });
}
