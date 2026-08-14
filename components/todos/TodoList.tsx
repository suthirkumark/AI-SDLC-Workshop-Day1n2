'use client';

import { useMemo } from 'react';
import type { Tag, Todo, TodoWithDetails } from '@/lib/types';
import { sectionizeTodos } from '@/lib/sorting';
import TodoItem from './TodoItem';

interface TodoListProps {
  /** Already filtered — sectioning and sorting happen here. */
  todos: TodoWithDetails[];
  emptyMessage: string;
  onToggleComplete: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  onTagClick: (tag: Tag) => void;
}

const SECTION_STYLES = {
  overdue: 'text-red-600 dark:text-red-400',
  pending: 'text-gray-600 dark:text-gray-300',
  completed: 'text-gray-400 dark:text-gray-500',
} as const;

export default function TodoList({
  todos,
  emptyMessage,
  onToggleComplete,
  onDelete,
  onRefresh,
  onTagClick,
}: TodoListProps) {
  const sections = useMemo(() => sectionizeTodos(todos), [todos]);

  if (todos.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8 italic">
        {emptyMessage}
      </p>
    );
  }

  const groups = [
    { key: 'overdue' as const, label: 'Overdue', todos: sections.overdue },
    { key: 'pending' as const, label: 'Pending', todos: sections.pending },
    { key: 'completed' as const, label: 'Completed', todos: sections.completed },
  ].filter((group) => group.todos.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2
            className={`text-xs font-semibold uppercase tracking-wide mb-2 ${SECTION_STYLES[group.key]}`}
          >
            {group.label} ({group.todos.length})
          </h2>
          <div className="space-y-3">
            {group.todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onRefresh={onRefresh}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
