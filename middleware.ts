import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production-32chars'
);

const PROTECTED_PATHS = ['/', '/calendar'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p))
  );

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('todo_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('todo_session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next|api|login|register|favicon.ico|.*\\..*).*)'],
};
