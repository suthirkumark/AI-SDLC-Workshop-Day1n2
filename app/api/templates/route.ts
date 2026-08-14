import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';
import { serializeTemplate } from '@/lib/template-service';
import { validateCreateTemplate } from '@/lib/template-validation';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const templates = templateDB.findAllByUser(session.userId).map(serializeTemplate);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const validation = validateCreateTemplate(await request.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const template = templateDB.create(session.userId, validation.value);
  return NextResponse.json(serializeTemplate(template), { status: 201 });
}
