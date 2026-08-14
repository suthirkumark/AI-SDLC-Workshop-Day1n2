import type { CreateTemplateDto, TemplateSubtask, UpdateTemplateDto } from './types';
import { isPriority, isRecurrencePattern, isReminderMinutes } from './types';
import type { ValidationResult } from './validation';

function invalid<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Normalises the subtask blueprints, renumbering positions from zero. */
function parseSubtasks(value: unknown): ValidationResult<TemplateSubtask[]> {
  if (!Array.isArray(value)) return invalid('subtasks must be an array');

  const subtasks: TemplateSubtask[] = [];
  for (const entry of value) {
    const title =
      isRecord(entry) && typeof entry.title === 'string'
        ? entry.title.trim()
        : typeof entry === 'string'
          ? entry.trim()
          : '';
    if (!title) return invalid('Every subtask needs a title');
    subtasks.push({ title, position: subtasks.length });
  }

  return { ok: true, value: subtasks };
}

function validateTemplateFields(
  body: Record<string, unknown>
): ValidationResult<UpdateTemplateDto> {
  const value: UpdateTemplateDto = {};

  if (body.description !== undefined) {
    value.description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;
  }

  if (body.category !== undefined) {
    value.category =
      typeof body.category === 'string' && body.category.trim() ? body.category.trim() : null;
  }

  if (body.priority !== undefined) {
    if (!isPriority(body.priority)) return invalid('Priority must be high, medium, or low');
    value.priority = body.priority;
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

  if (body.due_date_offset_minutes !== undefined) {
    if (body.due_date_offset_minutes === null || body.due_date_offset_minutes === '') {
      value.due_date_offset_minutes = null;
    } else {
      const offset = Number(body.due_date_offset_minutes);
      if (!Number.isInteger(offset) || offset < 0) {
        return invalid('Due date offset must be a non-negative whole number of minutes');
      }
      value.due_date_offset_minutes = offset;
    }
  }

  if (body.subtasks !== undefined) {
    if (body.subtasks === null) {
      value.subtasks = null;
    } else {
      const subtasks = parseSubtasks(body.subtasks);
      if (!subtasks.ok) return subtasks;
      value.subtasks = subtasks.value;
    }
  }

  return { ok: true, value };
}

/**
 * A template's recurrence and reminder settings only make sense if using it
 * produces a due date, so both require a due date offset.
 */
function checkDerivedInvariants(
  merged: Pick<
    CreateTemplateDto,
    'is_recurring' | 'recurrence_pattern' | 'reminder_minutes' | 'due_date_offset_minutes'
  >
): string | null {
  if (merged.is_recurring) {
    if (merged.due_date_offset_minutes == null) {
      return 'A recurring template needs a due date offset';
    }
    if (!merged.recurrence_pattern) {
      return 'A recurring template needs a recurrence pattern';
    }
  }

  if (merged.reminder_minutes != null && merged.due_date_offset_minutes == null) {
    return 'A template reminder needs a due date offset';
  }

  return null;
}

export function validateCreateTemplate(body: unknown): ValidationResult<CreateTemplateDto> {
  if (!isRecord(body)) return invalid('Request body must be an object');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return invalid('Template name is required');

  const titleTemplate =
    typeof body.title_template === 'string' ? body.title_template.trim() : '';
  if (!titleTemplate) return invalid('Template title is required');

  const fields = validateTemplateFields(body);
  if (!fields.ok) return fields;

  const value: CreateTemplateDto = {
    ...fields.value,
    name,
    title_template: titleTemplate,
  };

  const error = checkDerivedInvariants(value);
  if (error) return invalid(error);

  return { ok: true, value };
}

export function validateUpdateTemplate(
  body: unknown,
  existing: Pick<
    CreateTemplateDto,
    'is_recurring' | 'recurrence_pattern' | 'reminder_minutes' | 'due_date_offset_minutes'
  >
): ValidationResult<UpdateTemplateDto> {
  if (!isRecord(body)) return invalid('Request body must be an object');

  const value: UpdateTemplateDto = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return invalid('Template name cannot be empty');
    value.name = name;
  }

  if (body.title_template !== undefined) {
    const titleTemplate =
      typeof body.title_template === 'string' ? body.title_template.trim() : '';
    if (!titleTemplate) return invalid('Template title cannot be empty');
    value.title_template = titleTemplate;
  }

  const fields = validateTemplateFields(body);
  if (!fields.ok) return fields;

  const merged = { ...value, ...fields.value };
  const error = checkDerivedInvariants({
    is_recurring: merged.is_recurring ?? existing.is_recurring,
    recurrence_pattern:
      merged.recurrence_pattern !== undefined
        ? merged.recurrence_pattern
        : existing.recurrence_pattern,
    reminder_minutes:
      merged.reminder_minutes !== undefined ? merged.reminder_minutes : existing.reminder_minutes,
    due_date_offset_minutes:
      merged.due_date_offset_minutes !== undefined
        ? merged.due_date_offset_minutes
        : existing.due_date_offset_minutes,
  });
  if (error) return invalid(error);

  return { ok: true, value: merged };
}
