import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, todoDB, subtaskDB } from '@/lib/db';
import { getSingaporeNow, addMinutes } from '@/lib/timezone';
import type { TemplateSubtask } from '@/lib/db';

export async function POST(
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

  // Resolve due date from offset (Singapore time)
  const due_date =
    template.due_date_offset_minutes != null
      ? addMinutes(getSingaporeNow(), template.due_date_offset_minutes).toISOString()
      : null;

  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    priority: template.priority,
    due_date,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.recurrence_pattern,
    reminder_minutes: template.reminder_minutes,
    tag_ids: [], // templates never carry tags — chosen fresh per instance
  });

  // Deserialize subtasks_json; malformed JSON must not fail todo creation
  let subtasks: TemplateSubtask[] = [];
  if (template.subtasks_json) {
    try {
      subtasks = JSON.parse(template.subtasks_json);
    } catch {
      subtasks = [];
    }
  }

  for (const s of subtasks) {
    subtaskDB.create({ todo_id: todo.id, title: s.title, position: s.position });
  }

  const createdTodo = todoDB.findById(todo.id);
  return NextResponse.json(createdTodo, { status: 201 });
}
