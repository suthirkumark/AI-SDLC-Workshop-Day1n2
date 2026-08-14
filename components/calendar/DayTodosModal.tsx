'use client';

import type { Holiday, TodoWithDetails } from '@/lib/types';
import { formatSingaporeDisplay } from '@/lib/timezone';
import { PriorityBadge } from '@/components/todos/TodoBadges';

interface DayTodosModalProps {
  date: string;
  todos: TodoWithDetails[];
  holiday?: Holiday;
  onClose: () => void;
}

/** Read-only summary of everything due on one day. */
export default function DayTodosModal({ date, todos, holiday, onClose }: DayTodosModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Todos due on ${date}`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {formatSingaporeDisplay(date)}
        </h2>

        {holiday && (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">🎉 {holiday.name}</p>
        )}

        {todos.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500 italic">
            Nothing due on this day.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-start gap-2 border border-gray-200 dark:border-gray-700 rounded p-2"
              >
                <span aria-hidden className="text-sm leading-5">
                  {todo.completed ? '☑' : '☐'}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      todo.completed
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-800 dark:text-white'
                    }`}
                  >
                    {todo.title}
                  </p>
                  {todo.due_date?.includes('T') && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {todo.due_date.slice(11, 16)}
                    </p>
                  )}
                </div>
                <PriorityBadge priority={todo.priority} />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}
