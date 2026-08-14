import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticatorDB, userDB } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveChallenge } from "@/lib/webauthn-challenge-store";

const loginOptionsSchema = z.object({
  username: z.string().trim().min(1).max(64)
});

function getRpID(): string {
  return process.env.RP_ID ?? "localhost";
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (
    !checkRateLimit({
      key: `auth:login-options:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000
    })
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = loginOptionsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const username = parsed.data.username;
  const user = userDB.findByUsername(username);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or passkey" },
      { status: 400 }
    );
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json(
      { error: "Invalid username or passkey" },
      { status: 400 }
    );
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    allowCredentials: authenticators.map((authenticator) => ({
      id: authenticator.credential_id
    })),
    userVerification: "required"
  });

  saveChallenge("authentication", username, options.challenge);
  return NextResponse.json(options);
}
