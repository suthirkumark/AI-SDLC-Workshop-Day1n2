import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB, challengeStore } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { username, response } = await request.json();
  const trimmed = (username ?? '').trim();

  const authenticator = authenticatorDB.findByCredentialId(response.id);
  if (!authenticator) {
    return NextResponse.json({ error: 'Authenticator not recognized' }, { status: 401 });
  }

  const expectedChallenge = challengeStore.get(trimmed);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: process.env.RP_ORIGIN ?? 'http://localhost:3000',
      expectedRPID: process.env.RP_ID ?? 'localhost',
      credential: {
        id: authenticator.credential_id, // stored as base64url string
        publicKey: new Uint8Array(authenticator.credential_public_key),
        // Always coalesce — counter can be undefined on some authenticator records
        counter: authenticator.counter ?? 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Verification failed: ${(err as Error).message}` },
      { status: 401 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }

  challengeStore.delete(trimmed);

  authenticatorDB.updateCounter(
    authenticator.id,
    verification.authenticationInfo.newCounter ?? 0
  );

  const user = userDB.findById(authenticator.user_id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await createSession(user);

  return NextResponse.json({ success: true });
}
