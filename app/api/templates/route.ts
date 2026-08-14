import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';
import type { Priority, RecurrencePattern, TemplateSubtask } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const templates = templateDB.findAllByUser(session.userId);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();

  if (!body.name?.trim() || !body.title_template?.trim()) {
    return NextResponse.json({ error: 'Name and title are required' }, { status: 400 });
  }

  // Validate: recurring template must have a due_date_offset so created todos
  // satisfy PRP 03's requirement that recurring todos have a due date.
  if (body.is_recurring && body.due_date_offset_minutes == null) {
    return NextResponse.json(
      { error: 'Recurring templates require a due_date_offset_minutes' },
      { status: 400 }
    );
  }

  const subtasks: TemplateSubtask[] = body.subtasks ?? [];
  const subtasks_json = subtasks.length
    ? JSON.stringify(subtasks.map((s, i) => ({ title: s.title, position: i })))
    : null;

  const template = templateDB.create({
    user_id: session.userId,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    category: body.category?.trim() || null,
    title_template: body.title_template.trim(),
    priority: (body.priority ?? 'medium') as Priority,
    is_recurring: body.is_recurring ?? false,
    recurrence_pattern: (body.recurrence_pattern ?? null) as RecurrencePattern | null,
    reminder_minutes: body.reminder_minutes ?? null,
    due_date_offset_minutes: body.due_date_offset_minutes ?? null,
    subtasks_json,
  });

  return NextResponse.json(template, { status: 201 });
}
