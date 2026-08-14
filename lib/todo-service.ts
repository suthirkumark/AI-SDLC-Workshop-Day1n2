import 'server-only';
import { subtaskDB, tagDB, todoDB } from './db';
import type { Todo, TodoWithDetails } from './types';
import { calculateNextDueDate } from './recurrence';

/** Joins a todo with its subtasks and tags — the shape every todo route returns. */
export function withDetails(todo: Todo): TodoWithDetails {
  return {
    ...todo,
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  };
}

/**
 * Creates the next instance of a recurring todo, inheriting its title,
 * priority, tags, reminder offset, and recurrence pattern. Returns null when
 * the todo isn't recurring or is missing the data needed to schedule it.
 */
export function createNextRecurrence(todo: Todo): TodoWithDetails | null {
  if (!todo.is_recurring || !todo.recurrence_pattern || !todo.due_date) return null;

  const next = todoDB.create(todo.user_id, {
    title: todo.title,
    priority: todo.priority,
    due_date: calculateNextDueDate(todo.due_date, todo.recurrence_pattern),
    is_recurring: true,
    recurrence_pattern: todo.recurrence_pattern,
    reminder_minutes: todo.reminder_minutes,
  });

  for (const tag of tagDB.findByTodoId(todo.id)) {
    tagDB.attachToTodo(next.id, tag.id);
  }

  return withDetails(next);
}
