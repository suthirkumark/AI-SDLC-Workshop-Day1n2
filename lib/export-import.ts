import type { Priority, RecurrencePattern, TodoWithDetails } from './types';
import { isPriority, isRecurrencePattern, isReminderMinutes, reminderLabel } from './types';
import type { ValidationResult } from './validation';

export const EXPORT_VERSION = 1;

export interface ExportedSubtask {
  title: string;
  completed: boolean;
  position: number;
}

export interface ExportedTag {
  name: string;
  color: string;
}

/** A todo stripped of database identity — everything but the IDs survives a round trip. */
export interface ExportedTodo {
  title: string;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  created_at: string;
  subtasks: ExportedSubtask[];
  tags: ExportedTag[];
}

export interface ExportEnvelope {
  version: number;
  exported_at: string;
  todos: ExportedTodo[];
}

export function toExportedTodo(todo: TodoWithDetails): ExportedTodo {
  return {
    title: todo.title,
    completed: todo.completed,
    priority: todo.priority,
    due_date: todo.due_date,
    is_recurring: todo.is_recurring,
    recurrence_pattern: todo.recurrence_pattern,
    reminder_minutes: todo.reminder_minutes,
    created_at: todo.created_at,
    subtasks: todo.subtasks.map((s) => ({
      title: s.title,
      completed: s.completed,
      position: s.position,
    })),
    tags: todo.tags.map((t) => ({ name: t.name, color: t.color })),
  };
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'ID',
  'Title',
  'Completed',
  'Due Date',
  'Priority',
  'Recurring',
  'Pattern',
  'Reminder',
] as const;

/** Quotes a CSV field only when it contains a comma, quote, or newline. */
function csvEscape(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/** CSV export is a one-way, human-readable view — it is not re-importable. */
export function toCSV(todos: TodoWithDetails[]): string {
  const rows = todos.map((todo) =>
    [
      String(todo.id),
      todo.title,
      todo.completed ? 'Yes' : 'No',
      todo.due_date ?? '',
      todo.priority,
      todo.is_recurring ? 'Yes' : 'No',
      todo.recurrence_pattern ?? '',
      todo.reminder_minutes == null ? '' : reminderLabel(todo.reminder_minutes),
    ]
      .map(csvEscape)
      .join(',')
  );

  return [CSV_COLUMNS.join(','), ...rows].join('\r\n');
}

// ─── Import validation ────────────────────────────────────────────────────────

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function invalid<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateSubtask(raw: unknown, index: number): ValidationResult<ExportedSubtask> {
  if (!isRecord(raw)) return invalid(`Subtask ${index + 1} must be an object`);

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return invalid(`Subtask ${index + 1} is missing a title`);

  return {
    ok: true,
    value: {
      title,
      completed: raw.completed === true,
      position: typeof raw.position === 'number' ? raw.position : index,
    },
  };
}

function validateTag(raw: unknown, index: number): ValidationResult<ExportedTag> {
  if (!isRecord(raw)) return invalid(`Tag ${index + 1} must be an object`);

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return invalid(`Tag ${index + 1} is missing a name`);

  const color =
    typeof raw.color === 'string' && HEX_COLOR_RE.test(raw.color) ? raw.color : '#3B82F6';

  return { ok: true, value: { name, color } };
}

function validateTodo(raw: unknown, index: number): ValidationResult<ExportedTodo> {
  const label = `Todo ${index + 1}`;
  if (!isRecord(raw)) return invalid(`${label} must be an object`);

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return invalid(`${label} is missing a title`);

  const priority = isPriority(raw.priority) ? raw.priority : 'medium';
  const dueDate = typeof raw.due_date === 'string' && raw.due_date ? raw.due_date : null;
  const pattern = isRecurrencePattern(raw.recurrence_pattern) ? raw.recurrence_pattern : null;
  const reminder = isReminderMinutes(Number(raw.reminder_minutes))
    ? Number(raw.reminder_minutes)
    : null;

  // A recurring todo without a due date or pattern can't be scheduled, so it
  // comes in as a plain todo rather than failing the whole import.
  const isRecurring = raw.is_recurring === true && dueDate !== null && pattern !== null;

  const subtasks: ExportedSubtask[] = [];
  if (raw.subtasks !== undefined) {
    if (!Array.isArray(raw.subtasks)) return invalid(`${label} has a malformed subtasks list`);
    for (const [i, entry] of raw.subtasks.entries()) {
      const result = validateSubtask(entry, i);
      if (!result.ok) return invalid(`${label}: ${result.error}`);
      subtasks.push(result.value);
    }
  }

  const tags: ExportedTag[] = [];
  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags)) return invalid(`${label} has a malformed tags list`);
    for (const [i, entry] of raw.tags.entries()) {
      const result = validateTag(entry, i);
      if (!result.ok) return invalid(`${label}: ${result.error}`);
      tags.push(result.value);
    }
  }

  return {
    ok: true,
    value: {
      title,
      completed: raw.completed === true,
      priority,
      due_date: dueDate,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? pattern : null,
      reminder_minutes: dueDate ? reminder : null,
      created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
      subtasks: subtasks.sort((a, b) => a.position - b.position),
      tags,
    },
  };
}

/**
 * Validates an uploaded export envelope in full before any row is written —
 * a partial import is worse than a rejected one.
 */
export function validateImport(body: unknown): ValidationResult<ExportEnvelope> {
  if (!isRecord(body)) return invalid('Import file must be a JSON object');

  const version = Number(body.version);
  if (!Number.isInteger(version) || version < 1) {
    return invalid('Import file is missing a valid version');
  }
  if (version > EXPORT_VERSION) {
    return invalid(`Import file version ${version} is newer than this app supports`);
  }

  if (!Array.isArray(body.todos)) return invalid('Import file must contain a todos array');

  const todos: ExportedTodo[] = [];
  for (const [index, raw] of body.todos.entries()) {
    const result = validateTodo(raw, index);
    if (!result.ok) return invalid(result.error);
    todos.push(result.value);
  }

  return {
    ok: true,
    value: {
      version,
      exported_at: typeof body.exported_at === 'string' ? body.exported_at : '',
      todos,
    },
  };
}
