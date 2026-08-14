import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { todoDB, type TodoWithRelations } from "@/lib/db";
import {
    formatSingaporeDate,
    getSingaporeIsoTimestamp,
    getSingaporeNow
} from "@/lib/timezone";

interface TodoExport {
  version: 1;
  exported_at: string;
  todos: Array<{
    title: string;
    completed: boolean;
    due_date: string | null;
    priority: "high" | "medium" | "low";
    is_recurring: boolean;
    recurrence_pattern: "daily" | "weekly" | "monthly" | "yearly" | null;
    reminder_minutes: number | null;
    created_at: string;
    subtasks: Array<{ title: string; completed: boolean; position: number }>;
    tags: Array<{ name: string; color: string }>;
  }>;
}

function csvEscape(value: string): string {
  const requiresQuotes = /[",\n\r]/.test(value);
  if (!requiresQuotes) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(todos: TodoWithRelations[]): string {
  const header = [
    "ID",
    "Title",
    "Completed",
    "Due Date",
    "Priority",
    "Recurring",
    "Pattern",
    "Reminder"
  ];

  const rows = todos.map((todo) => [
    String(todo.id),
    todo.title,
    todo.completed ? "true" : "false",
    todo.due_date ?? "",
    todo.priority,
    todo.is_recurring ? "true" : "false",
    todo.recurrence_pattern ?? "",
    todo.reminder_minutes === null ? "" : String(todo.reminder_minutes)
  ]);

  return [header, ...rows]
    .map((columns) => columns.map((column) => csvEscape(column)).join(","))
    .join("\n");
}

function toExportPayload(todos: TodoWithRelations[]): TodoExport {
  return {
    version: 1,
    exported_at: getSingaporeIsoTimestamp(getSingaporeNow()),
    todos: todos.map((todo) => ({
      title: todo.title,
      completed: todo.completed,
      due_date: todo.due_date,
      priority: todo.priority,
      is_recurring: todo.is_recurring,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes,
      created_at: todo.created_at,
      subtasks: todo.subtasks.map((subtask) => ({
        title: subtask.title,
        completed: subtask.completed,
        position: subtask.position
      })),
      tags: todo.tags.map((tag) => ({
        name: tag.name,
        color: tag.color
      }))
    }))
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: "Invalid export format" },
      { status: 400 }
    );
  }

  const todos = todoDB.findAllWithRelations(session.userId);
  const datePart = formatSingaporeDate(getSingaporeNow(), "yyyy-MM-dd");

  if (format === "csv") {
    const csv = toCsv(todos);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="todos-${datePart}.csv"`
      }
    });
  }

  const payload = toExportPayload(todos);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="todos-${datePart}.json"`
    }
  });
}
