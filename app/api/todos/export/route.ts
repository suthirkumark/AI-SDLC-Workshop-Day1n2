import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAllByUser(session.userId);

  const exportData = todos.map((todo) => ({
    title: todo.title,
    completed: todo.completed,
    due_date: todo.due_date,
    priority: todo.priority,
    is_recurring: todo.is_recurring,
    recurrence_pattern: todo.recurrence_pattern,
    reminder_minutes: todo.reminder_minutes,
    created_at: todo.created_at,
    subtasks: subtaskDB.findAllByTodo(todo.id).map((s) => ({
      title: s.title,
      completed: s.completed,
      position: s.position,
    })),
    tags: tagDB.findByTodoId(todo.id).map((t) => ({
      name: t.name,
      color: t.color,
    })),
  }));

  return NextResponse.json({ todos: exportData, exported_at: new Date().toISOString() });
}
