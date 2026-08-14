import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { todoDB } from "@/lib/db";

const createTodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z
    .enum(["daily", "weekly", "monthly", "yearly"])
    .nullable()
    .optional(),
  reminder_minutes: z.number().int().nullable().optional(),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1),
        completed: z.boolean().optional()
      })
    )
    .optional(),
  tags: z
    .array(
      z.object({
        name: z.string().min(1),
        color: z.string().optional()
      })
    )
    .optional()
});

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const todos = todoDB.findAllWithRelations(session.userId);
  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createTodoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid todo payload" },
      { status: 400 }
    );
  }

  const todo = todoDB.createTodo(session.userId, parsed.data);
  return NextResponse.json({ todo }, { status: 201 });
}

export async function DELETE(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  todoDB.clearAll(session.userId);
  return NextResponse.json({ success: true });
}
