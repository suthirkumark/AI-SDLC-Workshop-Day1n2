import { NextRequest, NextResponse } from 'next/server';
import { userDB } from '@/lib/db';
import { createSession, SESSION_COOKIE, SESSION_DURATION } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  const trimmed = username?.trim();

  if (!trimmed) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const existing = userDB.findByUsername(trimmed);
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const user = userDB.create(trimmed);
  const token = await createSession({ userId: user.id, username: user.username });

  const response = NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
  return response;
}
