import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAllByUser(session.userId);
  const now = getSingaporeNow();
  const nowIso = now.toISOString();

  const dueTodos = todos.filter((todo) => {
    if (todo.completed || !todo.due_date || !todo.reminder_minutes) return false;
    const due = new Date(todo.due_date);
    const reminderAt = new Date(due.getTime() - todo.reminder_minutes * 60_000);
    const alreadySent = todo.last_notification_sent
      ? new Date(todo.last_notification_sent) >= reminderAt
      : false;
    return now >= reminderAt && now <= due && !alreadySent;
  });

  // Mark each as notified
  for (const todo of dueTodos) {
    todoDB.update(todo.id, { last_notification_sent: nowIso });
  }

  return NextResponse.json(
    dueTodos.map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      reminder_minutes: t.reminder_minutes,
    }))
  );
}
