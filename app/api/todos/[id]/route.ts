import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { createNextRecurrence, withDetails } from '@/lib/todo-service';
import { validateUpdateTodo } from '@/lib/validation';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id));

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json(withDetails(todo));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id));

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const validation = validateUpdateTodo(await request.json(), {
    due_date: todo.due_date,
    is_recurring: todo.is_recurring,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Completing a recurring todo schedules its next instance. Read the pattern
  // off the pre-update row so an edit in the same request can't skip a cycle.
  const isBeingCompleted = validation.value.completed === true && !todo.completed;
  const updated = todoDB.update(Number(id), validation.value);
  const nextInstance = isBeingCompleted ? createNextRecurrence(todo) : null;

  return NextResponse.json({
    ...withDetails(updated),
    ...(nextInstance ? { next_instance: nextInstance } : {}),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id));

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  todoDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
