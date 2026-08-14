import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runInTransaction, templateDB } from '@/lib/db';
import { createTodoFromTemplate } from '@/lib/template-service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // The todo and its subtasks land together or not at all.
  const todo = runInTransaction(() => createTodoFromTemplate(session.userId, template));
  return NextResponse.json(todo, { status: 201 });
}
