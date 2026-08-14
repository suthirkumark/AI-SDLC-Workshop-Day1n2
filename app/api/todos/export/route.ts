import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { withDetails } from '@/lib/todo-service';
import { EXPORT_VERSION, toCSV, toExportedTodo } from '@/lib/export-import';
import { formatSingaporeDate, formatSingaporeDateTime, getSingaporeNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const format = request.nextUrl.searchParams.get('format') ?? 'json';
  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'Format must be json or csv' }, { status: 400 });
  }

  const now = getSingaporeNow();
  const todos = todoDB.findAllByUser(session.userId).map(withDetails);
  const filename = `todos-${formatSingaporeDate(now)}.${format}`;

  if (format === 'csv') {
    return new NextResponse(toCSV(todos), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  const envelope = {
    version: EXPORT_VERSION,
    exported_at: formatSingaporeDateTime(now),
    todos: todos.map(toExportedTodo),
  };

  return new NextResponse(JSON.stringify(envelope, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
