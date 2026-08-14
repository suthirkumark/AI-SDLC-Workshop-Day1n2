import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);

  return NextResponse.json(holidayDB.findByMonth(year, month));
}
