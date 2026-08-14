import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB, challengeStore } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { username, response } = await request.json();
  const trimmed = (username ?? '').trim();

  const expectedChallenge = challengeStore.get(trimmed);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: process.env.RP_ORIGIN ?? 'http://localhost:3000',
      expectedRPID: process.env.RP_ID ?? 'localhost',
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  challengeStore.delete(trimmed);

  const { credential } = verification.registrationInfo;

  let user = userDB.findByUsername(trimmed);
  if (!user) {
    user = userDB.create(trimmed);
  }

  authenticatorDB.create({
    user_id: user.id,
    credential_id: Buffer.from(credential.id).toString('base64url'),
    credential_public_key: Buffer.from(credential.publicKey),
    counter: credential.counter ?? 0,
  });

  await createSession(user);

  return NextResponse.json({ success: true });
}
