import type { CreateTodoDto, UpdateTodoDto } from './types';
import { isPriority, isRecurrencePattern, isReminderMinutes } from './types';
import { addMinutes, getSingaporeNow, parseSingaporeDate } from './timezone';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

function invalid<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

/** A due date must parse, and must be at least one minute in the future. */
function checkDueDate(due: string): string | null {
  if (!DATE_RE.test(due)) {
    return 'Due date must be in YYYY-MM-DD or YYYY-MM-DDTHH:mm format';
  }

  const parsed = parseSingaporeDate(due);
  if (Number.isNaN(parsed.getTime())) return 'Due date is not a valid date';

  const earliest = addMinutes(getSingaporeNow(), 1);
  if (parsed.getTime() < earliest.getTime()) {
    return 'Due date must be at least one minute in the future';
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates the shared todo fields used by both create and update payloads. */
function validateTodoFields(
  body: Record<string, unknown>,
  existing: { due_date: string | null; is_recurring: boolean } | null
): ValidationResult<UpdateTodoDto> {
  const value: UpdateTodoDto = {};

  if (body.priority !== undefined) {
    if (!isPriority(body.priority)) return invalid('Priority must be high, medium, or low');
    value.priority = body.priority;
  }

  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === '') {
      value.due_date = null;
    } else if (typeof body.due_date !== 'string') {
      return invalid('Due date must be a string');
    } else {
      const error = checkDueDate(body.due_date);
      if (error) return invalid(error);
      value.due_date = body.due_date;
    }
  }

  if (body.is_recurring !== undefined) {
    if (typeof body.is_recurring !== 'boolean') return invalid('is_recurring must be a boolean');
    value.is_recurring = body.is_recurring;
  }

  if (body.recurrence_pattern !== undefined) {
    if (body.recurrence_pattern === null || body.recurrence_pattern === '') {
      value.recurrence_pattern = null;
    } else if (!isRecurrencePattern(body.recurrence_pattern)) {
      return invalid('Recurrence pattern must be daily, weekly, monthly, or yearly');
    } else {
      value.recurrence_pattern = body.recurrence_pattern;
    }
  }

  if (body.reminder_minutes !== undefined) {
    if (body.reminder_minutes === null || body.reminder_minutes === '') {
      value.reminder_minutes = null;
    } else if (!isReminderMinutes(Number(body.reminder_minutes))) {
      return invalid('Reminder must be one of 15, 30, 60, 120, 1440, 2880, or 10080 minutes');
    } else {
      value.reminder_minutes = Number(body.reminder_minutes);
    }
  }

  // Cross-field rules resolved against the post-update state of the todo.
  const dueDate = value.due_date !== undefined ? value.due_date : existing?.due_date ?? null;
  const isRecurring =
    value.is_recurring !== undefined ? value.is_recurring : existing?.is_recurring ?? false;

  if (isRecurring && !dueDate) {
    return invalid('A recurring todo needs a due date');
  }

  if (isRecurring && value.is_recurring === true && !value.recurrence_pattern) {
    return invalid('A recurring todo needs a recurrence pattern');
  }

  if (value.reminder_minutes != null && !dueDate) {
    return invalid('A reminder needs a due date');
  }

  return { ok: true, value };
}

export function validateCreateTodo(body: unknown): ValidationResult<CreateTodoDto> {
  if (!isRecord(body)) return invalid('Request body must be an object');

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return invalid('Title is required');

  const fields = validateTodoFields(body, null);
  if (!fields.ok) return fields;

  return { ok: true, value: { ...fields.value, title } };
}

export function validateUpdateTodo(
  body: unknown,
  existing: { due_date: string | null; is_recurring: boolean }
): ValidationResult<UpdateTodoDto> {
  if (!isRecord(body)) return invalid('Request body must be an object');

  const value: UpdateTodoDto = {};

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return invalid('Title cannot be empty');
    value.title = title;
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') return invalid('completed must be a boolean');
    value.completed = body.completed;
  }

  const fields = validateTodoFields(body, existing);
  if (!fields.ok) return fields;

  return { ok: true, value: { ...value, ...fields.value } };
}
