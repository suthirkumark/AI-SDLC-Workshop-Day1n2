'use client';

import { useState } from 'react';
import {
  REMINDER_OPTIONS,
  RECURRENCE_PATTERNS,
  type CreateTodoDto,
  type Priority,
  type RecurrencePattern,
  type Tag,
} from '@/lib/types';
import TagSelector from '@/components/tags/TagSelector';

interface TodoFormProps {
  allTags: Tag[];
  /** Resolves to an error message, or null when the todo was created. */
  onSubmit: (data: CreateTodoDto, tagIds: number[]) => Promise<string | null>;
}

export default function TodoForm({ allTags, onSubmit }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [pattern, setPattern] = useState<RecurrencePattern>('daily');
  const [reminder, setReminder] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Recurrence and reminders are both anchored to the due date, so neither is
  // offerable until one is set.
  const hasDueDate = dueDate !== '';

  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    if (!value) {
      setIsRecurring(false);
      setReminder('');
    }
  };

  const resetForm = () => {
    setTitle('');
    setPriority('medium');
    setDueDate('');
    setIsRecurring(false);
    setPattern('daily');
    setReminder('');
    setSelectedTagIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError('');

    try {
      const message = await onSubmit(
        {
          title: trimmed,
          priority,
          due_date: dueDate || null,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? pattern : null,
          reminder_minutes: reminder ? Number(reminder) : null,
        },
        selectedTagIds
      );

      if (message) {
        setError(message);
        return;
      }

      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-base font-semibold text-gray-800 dark:text-white">New Todo</h2>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        required
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {title.trim().length > 200 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          That is a long title — consider shortening it or moving detail into subtasks.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[120px]">
          <label htmlFor="todo-priority" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Priority
          </label>
          <select
            id="todo-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={fieldClass}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label htmlFor="todo-due" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Due date
          </label>
          <input
            id="todo-due"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex-1 min-w-[120px]">
          <label htmlFor="todo-reminder" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Reminder
          </label>
          <select
            id="todo-reminder"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            disabled={!hasDueDate}
            title={hasDueDate ? undefined : 'Set a due date to enable reminders'}
            className={fieldClass}
          >
            <option value="">None</option>
            {REMINDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} before
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 ${
            hasDueDate ? '' : 'opacity-50'
          }`}
          title={hasDueDate ? undefined : 'Set a due date to enable recurrence'}
        >
          <input
            type="checkbox"
            checked={isRecurring}
            disabled={!hasDueDate}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Repeat
        </label>

        {isRecurring && (
          <select
            aria-label="Recurrence pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as RecurrencePattern)}
            className={`${fieldClass} w-auto`}
          >
            {RECURRENCE_PATTERNS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {allTags.length > 0 && (
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</span>
          <TagSelector allTags={allTags} selectedIds={selectedTagIds} onToggle={handleToggleTag} />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add Todo'}
      </button>
    </form>
  );
}
