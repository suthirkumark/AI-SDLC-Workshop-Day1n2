import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';
import type { Priority, RecurrencePattern, TemplateSubtask } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(Number(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body = await request.json();

  const isRecurring = body.is_recurring ?? template.is_recurring;
  const offsetMinutes = body.due_date_offset_minutes ?? template.due_date_offset_minutes;
  if (isRecurring && offsetMinutes == null) {
    return NextResponse.json(
      { error: 'Recurring templates require a due_date_offset_minutes' },
      { status: 400 }
    );
  }

  let subtasks_json = template.subtasks_json;
  if (body.subtasks !== undefined) {
    const subtasks: TemplateSubtask[] = body.subtasks ?? [];
    subtasks_json = subtasks.length
      ? JSON.stringify(subtasks.map((s, i) => ({ title: s.title, position: i })))
      : null;
  }

  const updated = templateDB.update(Number(id), session.userId, {
    name: body.name?.trim(),
    description: body.description?.trim() || null,
    category: body.category?.trim() || null,
    title_template: body.title_template?.trim(),
    priority: body.priority as Priority | undefined,
    is_recurring: body.is_recurring,
    recurrence_pattern: body.recurrence_pattern as RecurrencePattern | undefined,
    reminder_minutes: body.reminder_minutes,
    due_date_offset_minutes: body.due_date_offset_minutes,
    subtasks_json,
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
  const template = templateDB.findById(Number(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  templateDB.delete(Number(id), session.userId);
  return NextResponse.json({ success: true });
}
