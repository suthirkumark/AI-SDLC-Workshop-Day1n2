import { NextResponse } from "next/server";

import { deleteSession, getSession } from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await deleteSession();
  return NextResponse.json({ success: true });
}
