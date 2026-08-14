'use client';

import { Tag, Todo } from '@/lib/types';
import TodoItem, { TodoWithDetails } from './TodoItem';

interface TodoListProps {
  todos: TodoWithDetails[];
  activeTagFilter: number | null;
  onToggleComplete: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  onTagClick: (tag: Tag) => void;
}

export default function TodoList({
  todos,
  activeTagFilter,
  onToggleComplete,
  onDelete,
  onRefresh,
  onTagClick,
}: TodoListProps) {
  const filtered = activeTagFilter
    ? todos.filter((t) => t.tags.some((tag) => tag.id === activeTagFilter))
    : todos;

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8 italic">
        {activeTagFilter ? 'No todos with that tag.' : 'No todos yet — add one above!'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((todo) => (
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
  );
}
