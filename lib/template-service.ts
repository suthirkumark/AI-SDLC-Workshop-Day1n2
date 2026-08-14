import 'server-only';
import { subtaskDB, todoDB } from './db';
import type { Template, TemplateSubtask, TodoWithDetails } from './types';
import { addMinutes, formatSingaporeDateTime, getSingaporeNow } from './timezone';
import { withDetails } from './todo-service';

/** A template as the client sees it — `subtasks_json` parsed into an array. */
export interface TemplateWithSubtasks extends Omit<Template, 'subtasks_json'> {
  subtasks: TemplateSubtask[];
}

export function parseTemplateSubtasks(subtasksJson: string | null): TemplateSubtask[] {
  if (!subtasksJson) return [];

  try {
    const parsed: unknown = JSON.parse(subtasksJson);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is TemplateSubtask =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as TemplateSubtask).title === 'string'
      )
      .map((entry, index) => ({
        title: entry.title,
        position: typeof entry.position === 'number' ? entry.position : index,
      }))
      .sort((a, b) => a.position - b.position);
  } catch {
    // A malformed blob shouldn't take down the templates list.
    return [];
  }
}

export function serializeTemplate(template: Template): TemplateWithSubtasks {
  const { subtasks_json, ...rest } = template;
  return { ...rest, subtasks: parseTemplateSubtasks(subtasks_json) };
}

/**
 * Creates a todo from a template. The due date is computed from the offset at
 * the moment of use; tags are deliberately not carried over.
 */
export function createTodoFromTemplate(
  userId: number,
  template: Template
): TodoWithDetails {
  const dueDate =
    template.due_date_offset_minutes == null
      ? null
      : formatSingaporeDateTime(
          addMinutes(getSingaporeNow(), template.due_date_offset_minutes)
        );

  const todo = todoDB.create(userId, {
    title: template.title_template,
    priority: template.priority,
    due_date: dueDate,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.recurrence_pattern,
    reminder_minutes: template.reminder_minutes,
  });

  const blueprints = parseTemplateSubtasks(template.subtasks_json);
  blueprints.forEach((subtask, index) => {
    subtaskDB.createAt(todo.id, subtask.title, index);
  });

  return withDetails(todo);
}
