import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionFromToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const session = await getSessionFromToken(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/calendar/:path*"]
};
