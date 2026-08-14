import type { Todo } from './types';
import { getSingaporeNow, parseSingaporeDate } from './timezone';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Ordering within the Overdue and Pending sections:
 * priority (high → low), then due date (earliest → latest, undated last),
 * then creation time (newest first) as the tiebreak.
 */
export function compareTodos(a: Todo, b: Todo): number {
  const byPriority = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  if (byPriority !== 0) return byPriority;

  if (a.due_date && b.due_date) {
    const byDue =
      parseSingaporeDate(a.due_date).getTime() - parseSingaporeDate(b.due_date).getTime();
    if (byDue !== 0) return byDue;
  } else if (a.due_date !== b.due_date) {
    // Exactly one has a due date — the undated todo sorts last.
    return a.due_date ? -1 : 1;
  }

  return b.created_at.localeCompare(a.created_at);
}

export interface TodoSections<T extends Todo> {
  overdue: T[];
  pending: T[];
  completed: T[];
}

/**
 * Split todos into Overdue / Pending / Completed.
 *
 * Overdue is an incomplete todo whose due date has passed; Pending is every
 * other incomplete todo, including undated ones. Completed todos are never
 * overdue regardless of due date, and are listed newest-first.
 */
export function sectionizeTodos<T extends Todo>(
  todos: T[],
  now: Date = getSingaporeNow()
): TodoSections<T> {
  const overdue: T[] = [];
  const pending: T[] = [];
  const completed: T[] = [];

  for (const todo of todos) {
    if (todo.completed) {
      completed.push(todo);
    } else if (todo.due_date && parseSingaporeDate(todo.due_date).getTime() < now.getTime()) {
      overdue.push(todo);
    } else {
      pending.push(todo);
    }
  }

  return {
    overdue: [...overdue].sort(compareTodos),
    pending: [...pending].sort(compareTodos),
    completed: [...completed].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** True when an incomplete todo's due date has already passed. */
export function isOverdue(todo: Todo, now: Date = getSingaporeNow()): boolean {
  if (todo.completed || !todo.due_date) return false;
  return parseSingaporeDate(todo.due_date).getTime() < now.getTime();
}
