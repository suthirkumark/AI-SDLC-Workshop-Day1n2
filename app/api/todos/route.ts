import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { withDetails } from '@/lib/todo-service';
import { validateCreateTodo } from '@/lib/validation';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAllByUser(session.userId).map(withDetails);
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const validation = validateCreateTodo(await request.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const todo = todoDB.create(session.userId, validation.value);
  return NextResponse.json({ ...todo, subtasks: [], tags: [] }, { status: 201 });
}
