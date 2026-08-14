import {
    type AuthenticationResponseJSON,
    verifyAuthenticationResponse
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSession } from "@/lib/auth";
import { authenticatorDB, userDB } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeChallenge } from "@/lib/webauthn-challenge-store";

const loginVerifySchema = z.object({
  username: z.string().trim().min(1).max(64),
  response: z.unknown()
});

function getExpectedConfig(): { expectedOrigin: string; expectedRPID: string } {
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
      key: `auth:login-verify:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000
    })
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = loginVerifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const username = parsed.data.username;
  const response = parsed.data.response as AuthenticationResponseJSON;

  const expectedChallenge = consumeChallenge("authentication", username);
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "Authentication challenge expired. Please retry." },
      { status: 400 }
    );
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or passkey" },
      { status: 401 }
    );
  }

  const authenticator = authenticatorDB.findByCredentialId(response.id);
  if (!authenticator || authenticator.user_id !== user.id) {
    return NextResponse.json(
      { error: "Authenticator not recognized" },
      { status: 401 }
    );
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    ...getExpectedConfig(),
    credential: {
      id: authenticator.credential_id,
      publicKey: new Uint8Array(authenticator.credential_public_key),
      counter: authenticator.counter ?? 0
    },
    requireUserVerification: true
  }).catch(() => null);

  if (!verification?.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  authenticatorDB.updateCounter(
    authenticator.id,
    verification.authenticationInfo.newCounter ?? 0
  );

  await createSession(user);
  return NextResponse.json({ success: true });
}
