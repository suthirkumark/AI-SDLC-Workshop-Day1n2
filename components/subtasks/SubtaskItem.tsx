'use client';

import { Subtask } from '@/lib/types';

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (subtask: Subtask) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function SubtaskItem({ subtask, onToggle, onDelete }: SubtaskItemProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={() => onToggle(subtask)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label={`Mark "${subtask.title}" as ${subtask.completed ? 'incomplete' : 'complete'}`}
      />
      <span
        className={`flex-1 text-sm ${
          subtask.completed
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {subtask.title}
      </span>
      <button
        type="button"
        onClick={() => onDelete(subtask.id)}
        className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-400 text-xs leading-none"
        aria-label={`Delete subtask "${subtask.title}"`}
      >
        ✕
      </button>
    </div>
  );
}
