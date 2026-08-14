import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Holiday data isn't user-scoped, but the session check keeps this route
  // consistent with the rest of the API surface.
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const yearParam = request.nextUrl.searchParams.get('year');
  const monthParam = request.nextUrl.searchParams.get('month');

  if (yearParam && monthParam) {
    const year = Number(yearParam);
    const month = Number(monthParam);

    // A malformed scope falls back to the full set rather than erroring — the
    // calendar should never lose its holiday layer over a bad query string.
    if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
      return NextResponse.json({ holidays: holidayDB.findByMonth(year, month) });
    }
  }

  return NextResponse.json({ holidays: holidayDB.findAll() });
}
