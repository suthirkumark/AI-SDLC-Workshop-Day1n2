import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { holidayDB } from "@/lib/db";

function isValidMonth(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= 2020 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  const holidays = isValidMonth(year, month)
    ? holidayDB.findByMonth(year, month)
    : holidayDB.findAll();

  return NextResponse.json({ holidays });
}
