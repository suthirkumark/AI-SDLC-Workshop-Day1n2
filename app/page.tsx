'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tag, Todo, CreateTodoDto } from '@/lib/types';
import TodoForm from '@/components/todos/TodoForm';
import TodoList from '@/components/todos/TodoList';
import FilterBar from '@/components/todos/FilterBar';
import ManageTagsModal from '@/components/tags/ManageTagsModal';
import { TodoWithDetails } from '@/components/todos/TodoItem';

export default function Home() {
  const [todos, setTodos] = useState<TodoWithDetails[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<number | null>(null);
  const [showManageTags, setShowManageTags] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) setTodos(await res.json());
  }, []);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    if (res.ok) setTags(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchTodos(), fetchTags()]).finally(() => setLoading(false));
  }, [fetchTodos, fetchTags]);

  const handleCreateTodo = async (data: CreateTodoDto, tagIds: number[]) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const todo: TodoWithDetails = await res.json();
    for (const tagId of tagIds) {
      await fetch('/api/todos/' + todo.id + '/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
    }
    await fetchTodos();
  };

  const handleToggleComplete = async (todo: Todo) => {
    await fetch('/api/todos/' + todo.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    await fetchTodos();
  };

  const handleDeleteTodo = async (id: number) => {
    await fetch('/api/todos/' + id, { method: 'DELETE' });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTagClick = (tag: Tag) => {
    setActiveTagFilter((prev) => (prev === tag.id ? null : tag.id));
  };

  const handleCreateTag = async (input: { name: string; color?: string }) => {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) await fetchTags();
  };

  const handleUpdateTag = async (id: number, input: { name?: string; color?: string }) => {
    const res = await fetch('/api/tags/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) { await fetchTags(); await fetchTodos(); }
  };

  const handleDeleteTag = async (id: number) => {
    const res = await fetch('/api/tags/' + id, { method: 'DELETE' });
    if (res.ok) {
      if (activeTagFilter === id) setActiveTagFilter(null);
      await fetchTags();
      await fetchTodos();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const filteredCount = activeTagFilter
    ? todos.filter((t) => t.tags.some((tag) => tag.id === activeTagFilter)).length
    : todos.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">Todo App</h1>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowManageTags(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            + Manage Tags
          </button>
          <button type="button" onClick={handleLogout} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <TodoForm allTags={tags} onSubmit={handleCreateTodo} />
        <FilterBar
          tags={tags}
          activeTagId={activeTagFilter}
          onTagChange={setActiveTagFilter}
          totalCount={todos.length}
          filteredCount={filteredCount}
        />
        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Loading...</p>
        ) : (
          <TodoList todos={todos} activeTagFilter={activeTagFilter} onToggleComplete={handleToggleComplete} onDelete={handleDeleteTodo} onRefresh={fetchTodos} onTagClick={handleTagClick} />
        )}
      </main>
      {showManageTags && (
        <ManageTagsModal tags={tags} onClose={() => setShowManageTags(false)} onCreate={handleCreateTag} onUpdate={handleUpdateTag} onDelete={handleDeleteTag} />
      )}
    </div>
  );
}
