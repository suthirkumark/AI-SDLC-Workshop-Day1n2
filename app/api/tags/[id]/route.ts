import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = tagDB.findById(Number(id), session.userId);

  if (!existing) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  const { name, color } = await request.json();
  const trimmedName = name?.trim();

  if (trimmedName !== undefined && !trimmedName) {
    return NextResponse.json({ error: 'Tag name cannot be empty' }, { status: 400 });
  }

  if (color && !HEX_COLOR_RE.test(color)) {
    return NextResponse.json({ error: 'Color must be a valid hex code (e.g. #3B82F6)' }, { status: 400 });
  }

  try {
    const updated = tagDB.update(Number(id), session.userId, {
      name: trimmedName,
      color,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = tagDB.findById(Number(id), session.userId);

  if (!existing) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  tagDB.delete(Number(id), session.userId);
  return NextResponse.json({ success: true });
}
