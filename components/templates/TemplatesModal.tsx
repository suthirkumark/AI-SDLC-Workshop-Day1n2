'use client';

import { useState } from 'react';
import {
  REMINDER_OPTIONS,
  RECURRENCE_PATTERNS,
  type Priority,
  type RecurrencePattern,
  type TemplateSubtask,
} from '@/lib/types';

export interface TemplateSummary {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks: TemplateSubtask[];
}

export interface CreateTemplatePayload {
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks: TemplateSubtask[];
}

interface TemplatesModalProps {
  templates: TemplateSummary[];
  onClose: () => void;
  onCreate: (payload: CreateTemplatePayload) => Promise<string | null>;
  onUse: (id: number) => Promise<string | null>;
  onDelete: (id: number) => Promise<void>;
}

const OFFSET_UNITS = [
  { value: 1, label: 'minutes' },
  { value: 60, label: 'hours' },
  { value: 1440, label: 'days' },
] as const;

const FIELD_CLASS =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';

/** Renders an offset in minutes as the largest whole unit that divides it. */
function describeOffset(minutes: number | null): string {
  if (minutes == null) return 'no due date';
  if (minutes % 1440 === 0) return `due in ${minutes / 1440}d`;
  if (minutes % 60 === 0) return `due in ${minutes / 60}h`;
  return `due in ${minutes}m`;
}

export default function TemplatesModal({
  templates,
  onClose,
  onCreate,
  onUse,
  onDelete,
}: TemplatesModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [titleTemplate, setTitleTemplate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [offsetValue, setOffsetValue] = useState('');
  const [offsetUnit, setOffsetUnit] = useState<number>(1440);
  const [isRecurring, setIsRecurring] = useState(false);
  const [pattern, setPattern] = useState<RecurrencePattern>('weekly');
  const [reminder, setReminder] = useState('');
  const [subtaskText, setSubtaskText] = useState('');

  // Recurrence and reminders both need a due date, which a template only
  // produces when it carries an offset.
  const hasOffset = offsetValue.trim() !== '';

  const resetForm = () => {
    setName('');
    setCategory('');
    setTitleTemplate('');
    setPriority('medium');
    setOffsetValue('');
    setOffsetUnit(1440);
    setIsRecurring(false);
    setPattern('weekly');
    setReminder('');
    setSubtaskText('');
  };

  const handleCreate = async () => {
    setError('');
    setBusy(true);

    try {
      const subtasks: TemplateSubtask[] = subtaskText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title, position) => ({ title, position }));

      const message = await onCreate({
        name: name.trim(),
        description: null,
        category: category.trim() || null,
        title_template: titleTemplate.trim(),
        priority,
        is_recurring: hasOffset && isRecurring,
        recurrence_pattern: hasOffset && isRecurring ? pattern : null,
        reminder_minutes: hasOffset && reminder ? Number(reminder) : null,
        due_date_offset_minutes: hasOffset ? Number(offsetValue) * offsetUnit : null,
        subtasks,
      });

      if (message) {
        setError(message);
        return;
      }

      resetForm();
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const handleUse = async (id: number) => {
    setError('');
    setBusy(true);
    try {
      const message = await onUse(id);
      if (message) setError(message);
      else onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Templates"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Templates</h2>

        {templates.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-4">
            No templates yet — save one to reuse a todo pattern.
          </p>
        ) : (
          <ul className="space-y-2 mb-4">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-start gap-2 border border-gray-200 dark:border-gray-700 rounded p-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {template.name}
                    {template.category && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {template.category}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {template.title_template}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {template.priority} · {describeOffset(template.due_date_offset_minutes)}
                    {template.is_recurring && template.recurrence_pattern
                      ? ` · repeats ${template.recurrence_pattern}`
                      : ''}
                    {template.subtasks.length > 0
                      ? ` · ${template.subtasks.length} subtask${template.subtasks.length !== 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleUse(template.id)}
                  disabled={busy}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 flex-shrink-0"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(template.id)}
                  aria-label={`Delete template "${template.name}"`}
                  className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 text-sm flex-shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {showForm ? (
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              aria-label="Template name"
              className={FIELD_CLASS}
            />
            <input
              type="text"
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              placeholder="Todo title this template creates"
              aria-label="Todo title"
              className={FIELD_CLASS}
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              aria-label="Category"
              className={FIELD_CLASS}
            />

            <div className="flex gap-2">
              <select
                aria-label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={FIELD_CLASS}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <input
                type="number"
                min="0"
                value={offsetValue}
                onChange={(e) => setOffsetValue(e.target.value)}
                placeholder="Due in"
                aria-label="Due date offset"
                className={FIELD_CLASS}
              />

              <select
                aria-label="Due date offset unit"
                value={offsetUnit}
                onChange={(e) => setOffsetUnit(Number(e.target.value))}
                className={FIELD_CLASS}
              >
                {OFFSET_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 ${hasOffset ? '' : 'opacity-50'}`}
                title={hasOffset ? undefined : 'Set a due date offset to enable recurrence'}
              >
                <input
                  type="checkbox"
                  checked={isRecurring}
                  disabled={!hasOffset}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Repeat
              </label>

              {isRecurring && hasOffset && (
                <select
                  aria-label="Recurrence pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value as RecurrencePattern)}
                  className={`${FIELD_CLASS} w-auto`}
                >
                  {RECURRENCE_PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label="Reminder"
                value={reminder}
                disabled={!hasOffset}
                onChange={(e) => setReminder(e.target.value)}
                title={hasOffset ? undefined : 'Set a due date offset to enable reminders'}
                className={`${FIELD_CLASS} w-auto`}
              >
                <option value="">No reminder</option>
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} before
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={subtaskText}
              onChange={(e) => setSubtaskText(e.target.value)}
              placeholder="Subtasks — one per line (optional)"
              aria-label="Subtasks, one per line"
              rows={3}
              className={FIELD_CLASS}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy || !name.trim() || !titleTemplate.trim()}
                className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Save template
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + New template
          </button>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400 mt-3">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 block text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}
