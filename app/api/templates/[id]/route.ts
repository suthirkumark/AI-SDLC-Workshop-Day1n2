import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';
import { serializeTemplate } from '@/lib/template-service';
import { validateUpdateTemplate } from '@/lib/template-validation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = templateDB.findById(Number(id), session.userId);

  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const validation = validateUpdateTemplate(await request.json(), {
    is_recurring: existing.is_recurring,
    recurrence_pattern: existing.recurrence_pattern,
    reminder_minutes: existing.reminder_minutes,
    due_date_offset_minutes: existing.due_date_offset_minutes,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const updated = templateDB.update(Number(id), session.userId, validation.value);
  return NextResponse.json(serializeTemplate(updated!));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = templateDB.findById(Number(id), session.userId);

  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Todos already created from this template are left untouched by design.
  templateDB.delete(Number(id), session.userId);
  return NextResponse.json({ success: true });
}
