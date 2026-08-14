// Shared types — safe to import in both Server and Client components.
// No Node.js runtime imports allowed here.

export type Priority = 'high' | 'medium' | 'low';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** 15m, 30m, 1h, 2h, 1d, 2d, 1w — expressed in minutes before the due date. */
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;

export const PRIORITIES: readonly Priority[] = ['high', 'medium', 'low'];

export const RECURRENCE_PATTERNS: readonly RecurrencePattern[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

export const REMINDER_OPTIONS: readonly { value: ReminderMinutes; label: string }[] = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 1440, label: '1d' },
  { value: 2880, label: '2d' },
  { value: 10080, label: '1w' },
];

export const REMINDER_VALUES: readonly number[] = REMINDER_OPTIONS.map((o) => o.value);

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

export function isRecurrencePattern(value: unknown): value is RecurrencePattern {
  return (
    typeof value === 'string' && (RECURRENCE_PATTERNS as readonly string[]).includes(value)
  );
}

export function isReminderMinutes(value: unknown): value is ReminderMinutes {
  return typeof value === 'number' && REMINDER_VALUES.includes(value);
}

/** Human-readable label for a reminder offset, e.g. 1440 -> "1d". */
export function reminderLabel(minutes: number): string {
  return REMINDER_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes}m`;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoDto {
  title: string;
  priority?: Priority;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
}

export interface UpdateTodoDto {
  title?: string;
  completed?: boolean;
  priority?: Priority;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  last_notification_sent?: string | null;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface CreateSubtaskDto {
  title: string;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

/** A subtask blueprint stored inside `templates.subtasks_json`. */
export interface TemplateSubtask {
  title: string;
  position: number;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string | null;
  category?: string | null;
  title_template: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  due_date_offset_minutes?: number | null;
  subtasks?: TemplateSubtask[] | null;
}

export type UpdateTemplateDto = Partial<CreateTemplateDto>;

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

/** A todo joined with its subtasks and tags — the shape every todo API route returns. */
export interface TodoWithDetails extends Todo {
  subtasks: Subtask[];
  tags: Tag[];
}

export function calculateProgress(subtasks: Subtask[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
