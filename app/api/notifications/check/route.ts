import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import type { Todo } from '@/lib/types';
import {
  addMinutes,
  formatSingaporeDateTime,
  getSingaporeNow,
  parseSingaporeDate,
} from '@/lib/timezone';

/**
 * A reminder is due when now falls inside [due_date - reminder_minutes, due_date]
 * and the last notification predates that window — so each window fires once,
 * even though the client polls every 30 seconds.
 */
function isReminderDue(todo: Todo, now: Date): boolean {
  if (!todo.due_date || todo.reminder_minutes == null) return false;

  const due = parseSingaporeDate(todo.due_date);
  const windowStart = addMinutes(due, -todo.reminder_minutes);

  if (now.getTime() < windowStart.getTime() || now.getTime() > due.getTime()) return false;

  if (!todo.last_notification_sent) return true;
  return parseSingaporeDate(todo.last_notification_sent).getTime() < windowStart.getTime();
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const now = getSingaporeNow();
  const due = todoDB
    .findRemindable(session.userId)
    .filter((todo) => isReminderDue(todo, now))
    .map((todo) => ({
      id: todo.id,
      title: todo.title,
      due_date: todo.due_date,
      priority: todo.priority,
      reminder_minutes: todo.reminder_minutes,
    }));

  return NextResponse.json({ notifications: due, checked_at: formatSingaporeDateTime(now) });
}

/** Marks reminders as delivered so the next poll doesn't re-fire them. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const ids: unknown = body?.todo_ids;

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'number')) {
    return NextResponse.json({ error: 'todo_ids must be an array of numbers' }, { status: 400 });
  }

  const sentAt = formatSingaporeDateTime(getSingaporeNow());
  let marked = 0;

  for (const id of ids as number[]) {
    const todo = todoDB.findById(id);
    if (!todo || todo.user_id !== session.userId) continue;
    todoDB.markNotificationSent(id, sentAt);
    marked += 1;
  }

  return NextResponse.json({ marked, sent_at: sentAt });
}
