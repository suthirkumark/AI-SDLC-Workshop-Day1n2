import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB, challengeStore } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  const trimmed = (username ?? '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const existing = userDB.findByUsername(trimmed);
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const options = await generateRegistrationOptions({
    rpName: process.env.RP_NAME ?? 'Todo App',
    rpID: process.env.RP_ID ?? 'localhost',
    userName: trimmed,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  challengeStore.save(trimmed, options.challenge);

  return NextResponse.json({ ...options, _username: trimmed });
}
