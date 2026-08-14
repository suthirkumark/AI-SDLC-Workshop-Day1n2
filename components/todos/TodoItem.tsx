'use client';

import { Todo, Tag, Subtask } from '@/lib/types';
import SubtaskList from '@/components/subtasks/SubtaskList';
import TagPill from '@/components/tags/TagPill';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export interface TodoWithDetails extends Todo {
  subtasks: Subtask[];
  tags: Tag[];
}

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
  return (
    <div
      className={`rounded-lg border p-4 bg-white dark:bg-gray-800 shadow-sm transition-opacity ${
        todo.completed ? 'opacity-60' : ''
      } border-gray-200 dark:border-gray-700`}
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
              className={`text-sm font-medium ${
                todo.completed
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-800 dark:text-white'
              }`}
            >
              {todo.title}
            </span>

            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[todo.priority]}`}
            >
              {todo.priority}
            </span>

            {todo.due_date && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{todo.due_date}</span>
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

          <SubtaskList
            todoId={todo.id}
            subtasks={todo.subtasks}
            onChange={onRefresh}
          />
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
