'use client';

import type { Tag, Todo, TodoWithDetails } from '@/lib/types';
import { formatSingaporeDisplay } from '@/lib/timezone';
import { isOverdue } from '@/lib/sorting';
import SubtaskList from '@/components/subtasks/SubtaskList';
import TagPill from '@/components/tags/TagPill';
import {
  OverdueBadge,
  PriorityBadge,
  RecurrenceBadge,
  ReminderBadge,
} from './TodoBadges';

export type { TodoWithDetails };

interface TodoItemProps {
  todo: TodoWithDetails;
  onToggleComplete: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  onTagClick: (tag: Tag) => void;
}

export default function TodoItem({
  todo,
  onToggleComplete,
  onDelete,
  onRefresh,
  onTagClick,
}: TodoItemProps) {
  const overdue = isOverdue(todo);

  return (
    <div
      className={`rounded-lg border p-4 bg-white dark:bg-gray-800 shadow-sm transition-opacity ${
        todo.completed ? 'opacity-60' : ''
      } ${
        overdue
          ? 'border-red-300 dark:border-red-800'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggleComplete(todo)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-medium break-words ${
                todo.completed
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-800 dark:text-white'
              }`}
            >
              {todo.title}
            </span>

            <PriorityBadge priority={todo.priority} />

            {todo.is_recurring && todo.recurrence_pattern && (
              <RecurrenceBadge pattern={todo.recurrence_pattern} />
            )}

            {todo.reminder_minutes != null && <ReminderBadge minutes={todo.reminder_minutes} />}

            {overdue && <OverdueBadge />}

            {todo.due_date && (
              <span
                className={`text-xs ${
                  overdue
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {formatSingaporeDisplay(todo.due_date)}
              </span>
            )}
          </div>

          {todo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {todo.tags.map((tag) => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  selected
                  showDot={false}
                  onClick={() => onTagClick(tag)}
                />
              ))}
            </div>
          )}

          <SubtaskList todoId={todo.id} subtasks={todo.subtasks} onChange={onRefresh} />
        </div>

        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 text-sm leading-none flex-shrink-0"
          aria-label={`Delete todo "${todo.title}"`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
