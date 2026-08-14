import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';
import { getSingaporeNow, addMinutes } from '@/lib/timezone';
import type { RecurrencePattern } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }
  return NextResponse.json(todo);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = todoDB.findById(Number(id));
  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json();

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }

  // Handle completion of a recurring todo: create the next instance
  if (body.completed === true && existing.is_recurring && existing.recurrence_pattern && existing.due_date) {
    const nextDue = computeNextDue(existing.due_date, existing.recurrence_pattern);
    const existingTags = tagDB.findByTodoId(existing.id);
    todoDB.create({
      user_id: session.userId,
      title: existing.title,
      due_date: nextDue,
      priority: existing.priority,
      is_recurring: true,
      recurrence_pattern: existing.recurrence_pattern,
      reminder_minutes: existing.reminder_minutes,
      tag_ids: existingTags.map((t) => t.id),
    });
  }

  const updated = todoDB.update(Number(id), {
    ...body,
    title: body.title !== undefined ? body.title.trim() : undefined,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = todoDB.findById(Number(id));
  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  todoDB.delete(Number(id));
  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeNextDue(dueDateStr: string, pattern: RecurrencePattern): string {
  const due = new Date(dueDateStr);
  const now = getSingaporeNow();
  let next = new Date(due);

  while (next <= now) {
    switch (pattern) {
      case 'daily':   next = addMinutes(next, 60 * 24); break;
      case 'weekly':  next = addMinutes(next, 60 * 24 * 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'yearly':  next.setFullYear(next.getFullYear() + 1); break;
    }
  }

  return next.toISOString();
}
