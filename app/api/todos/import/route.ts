import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runInTransaction, subtaskDB, tagDB, todoDB } from '@/lib/db';
import { validateImport } from '@/lib/export-import';
import type { Tag } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Import file is not valid JSON' }, { status: 400 });
  }

  // The whole file is validated up front so nothing is written on a bad import.
  const validation = validateImport(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { userId } = session;

  try {
    const summary = runInTransaction(() => {
      // Tag names are matched case-insensitively, so an import reuses the
      // user's existing tags instead of creating near-duplicates.
      const tagCache = new Map<string, Tag>();
      const resolveTag = (name: string, color: string): Tag => {
        const key = name.toLowerCase();
        const cached = tagCache.get(key);
        if (cached) return cached;

        const tag = tagDB.findByName(userId, name) ?? tagDB.create(userId, { name, color });
        tagCache.set(key, tag);
        return tag;
      };

      let todosCreated = 0;
      let subtasksCreated = 0;
      let tagsCreated = 0;
      const existingTagIds = new Set(tagDB.findAllByUser(userId).map((t) => t.id));

      for (const imported of validation.value.todos) {
        const todo = todoDB.create(userId, {
          title: imported.title,
          priority: imported.priority,
          due_date: imported.due_date,
          is_recurring: imported.is_recurring,
          recurrence_pattern: imported.recurrence_pattern,
          reminder_minutes: imported.reminder_minutes,
        });
        todosCreated += 1;

        if (imported.completed) {
          todoDB.update(todo.id, { completed: true });
        }

        imported.subtasks.forEach((subtask, index) => {
          const created = subtaskDB.createAt(todo.id, subtask.title, index);
          if (subtask.completed) subtaskDB.update(created.id, { completed: true });
          subtasksCreated += 1;
        });

        for (const tag of imported.tags) {
          const resolved = resolveTag(tag.name, tag.color);
          if (!existingTagIds.has(resolved.id)) {
            existingTagIds.add(resolved.id);
            tagsCreated += 1;
          }
          tagDB.attachToTodo(todo.id, resolved.id);
        }
      }

      return { todosCreated, subtasksCreated, tagsCreated };
    });

    return NextResponse.json({ success: true, ...summary }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Import failed and was rolled back: ${message}` },
      { status: 500 }
    );
  }
}
