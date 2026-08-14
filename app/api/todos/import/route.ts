import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';

interface ImportSubtask {
  title: string;
  completed?: boolean;
  position?: number;
}

interface ImportTag {
  name: string;
  color?: string;
}

interface ImportTodo {
  title: string;
  completed?: boolean;
  due_date?: string | null;
  priority?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  reminder_minutes?: number | null;
  subtasks?: ImportSubtask[];
  tags?: ImportTag[];
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const importTodos: ImportTodo[] = body.todos ?? [];

  if (!Array.isArray(importTodos)) {
    return NextResponse.json({ error: 'Invalid import format' }, { status: 400 });
  }

  const imported: number[] = [];

  for (const item of importTodos) {
    if (!item.title?.trim()) continue;

    // Resolve tag IDs
    const tagIds: number[] = [];
    for (const tagData of item.tags ?? []) {
      if (!tagData.name) continue;
      let tag = tagDB.findAllByUser(session.userId).find((t) => t.name === tagData.name);
      if (!tag) {
        tag = tagDB.create(session.userId, { name: tagData.name, color: tagData.color ?? '#3B82F6' });
      }
      tagIds.push(tag.id);
    }

    const todo = todoDB.create({
      user_id: session.userId,
      title: item.title.trim(),
      due_date: item.due_date ?? null,
      priority: (item.priority as 'high' | 'medium' | 'low') ?? 'medium',
      is_recurring: item.is_recurring ?? false,
      recurrence_pattern: (item.recurrence_pattern as 'daily' | 'weekly' | 'monthly' | 'yearly') ?? null,
      reminder_minutes: item.reminder_minutes ?? null,
      tag_ids: tagIds,
    });

    if (item.completed) {
      todoDB.update(todo.id, { completed: true });
    }

    for (const sub of item.subtasks ?? []) {
      if (!sub.title?.trim()) continue;
      const created = subtaskDB.create({ todo_id: todo.id, title: sub.title.trim(), position: sub.position ?? 0 });
      if (sub.completed) {
        subtaskDB.update(created.id, { completed: true });
      }
    }

    imported.push(todo.id);
  }

  return NextResponse.json({ imported: imported.length, ids: imported }, { status: 201 });
}
