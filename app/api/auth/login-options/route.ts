import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB, challengeStore } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  const trimmed = (username ?? '').trim();

  const user = userDB.findByUsername(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  if (!authenticators.length) {
    return NextResponse.json({ error: 'No authenticators registered' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID ?? 'localhost',
    userVerification: 'preferred',
    allowCredentials: authenticators.map((a) => ({
      id: a.credential_id, // stored as base64url string
    })),
  });

  challengeStore.save(trimmed, options.challenge);

  return NextResponse.json({ ...options, _username: trimmed });
}
