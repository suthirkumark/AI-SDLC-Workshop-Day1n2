import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAllByUser(session.userId);
  const todosWithDetails = todos.map((todo) => ({
    ...todo,
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  }));

  return NextResponse.json(todosWithDetails);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { title, priority, due_date } = await request.json();
  const trimmed = title?.trim();

  if (!trimmed) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const todo = todoDB.create(session.userId, { title: trimmed, priority, due_date });
  return NextResponse.json({ ...todo, subtasks: [], tags: [] }, { status: 201 });
}
