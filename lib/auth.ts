import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'todo_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production-32chars'
);
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  userId: number;
  username: string;
}

export async function createSession(session: Session): Promise<string> {
  return new SignJWT({ userId: session.userId, username: session.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.userId !== 'number' || typeof payload.username !== 'string') {
      return null;
    }
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_DURATION };
