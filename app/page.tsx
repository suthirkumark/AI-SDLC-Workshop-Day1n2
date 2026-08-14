'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CreateTodoDto, Tag, Todo, TodoWithDetails } from '@/lib/types';
import { applyFilters, EMPTY_FILTERS, hasActiveFilters, type FilterState } from '@/lib/filters';
import { useNotifications } from '@/lib/hooks/useNotifications';
import TodoForm from '@/components/todos/TodoForm';
import TodoList from '@/components/todos/TodoList';
import FilterBar from '@/components/todos/FilterBar';
import ManageTagsModal from '@/components/tags/ManageTagsModal';
import TemplatesModal, {
  type CreateTemplatePayload,
  type TemplateSummary,
} from '@/components/templates/TemplatesModal';

/** Pulls the server's error message out of a failed response. */
async function errorFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [todos, setTodos] = useState<TodoWithDetails[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showManageTags, setShowManageTags] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement>(null);
  const { permission, requestPermission } = useNotifications();

  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) setTodos(await res.json());
  }, []);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    if (res.ok) setTags(await res.json());
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/templates');
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTodos(), fetchTags(), fetchTemplates()]);
      setLoading(false);
    };
    load();
  }, [fetchTodos, fetchTags, fetchTemplates]);

  const handleCreateTodo = async (data: CreateTodoDto, tagIds: number[]) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) return errorFrom(res, 'Could not create the todo');

    const todo: TodoWithDetails = await res.json();
    for (const tagId of tagIds) {
      await fetch(`/api/todos/${todo.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
    }

    await fetchTodos();
    return null;
  };

  const handleToggleComplete = async (todo: Todo) => {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });

    if (!res.ok) {
      setBanner({ kind: 'error', text: await errorFrom(res, 'Could not update the todo') });
      return;
    }

    // Completing a recurring todo spawns its next instance server-side.
    const updated = await res.json();
    if (updated?.next_instance) {
      setBanner({ kind: 'info', text: `Next "${todo.title}" scheduled.` });
    }

    await fetchTodos();
  };

  const handleDeleteTodo = async (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    if (!res.ok) await fetchTodos();
  };

  const handleTagClick = (tag: Tag) => {
    setFilters((prev) => ({ ...prev, tagId: prev.tagId === tag.id ? null : tag.id }));
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
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) { await fetchTags(); await fetchTodos(); }
  };

  const handleDeleteTag = async (id: number) => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFilters((prev) => (prev.tagId === id ? { ...prev, tagId: null } : prev));
      await fetchTags();
      await fetchTodos();
    }
  };

  const handleCreateTemplate = async (payload: CreateTemplatePayload) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return errorFrom(res, 'Could not save the template');

    await fetchTemplates();
    return null;
  };

  const handleUseTemplate = async (id: number) => {
    const res = await fetch(`/api/templates/${id}/use`, { method: 'POST' });
    if (!res.ok) return errorFrom(res, 'Could not create a todo from this template');

    await fetchTodos();
    setBanner({ kind: 'info', text: 'Todo created from template.' });
    return null;
  };

  const handleDeleteTemplate = async (id: number) => {
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchTemplates();
  };

  const handleImportFile = async (file: File) => {
    setBanner(null);

    try {
      const parsed = JSON.parse(await file.text());
      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        setBanner({ kind: 'error', text: await errorFrom(res, 'Import failed') });
        return;
      }

      const summary = await res.json();
      setBanner({
        kind: 'info',
        text: `Imported ${summary.todosCreated} todo${summary.todosCreated !== 1 ? 's' : ''}.`,
      });
      await Promise.all([fetchTodos(), fetchTags()]);
    } catch {
      setBanner({ kind: 'error', text: 'That file is not valid JSON.' });
    }
  };

  /** Downloads an export. The API route sets the filename via Content-Disposition. */
  const handleExport = (format: 'json' | 'csv') => {
    const link = document.createElement('a');
    link.href = `/api/todos/export?format=${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const visibleTodos = useMemo(() => applyFilters(todos, filters), [todos, filters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">Todo App</h1>

        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/calendar" className="text-blue-600 dark:text-blue-400 hover:underline">
            Calendar
          </Link>
          <button type="button" onClick={() => setShowTemplates(true)} className="text-blue-600 dark:text-blue-400 hover:underline">
            Templates
          </button>
          <button type="button" onClick={() => setShowManageTags(true)} className="text-blue-600 dark:text-blue-400 hover:underline">
            Manage Tags
          </button>
          <button type="button" onClick={() => handleExport('json')} className="text-blue-600 dark:text-blue-400 hover:underline">
            Export JSON
          </button>
          <button type="button" onClick={() => handleExport('csv')} className="text-blue-600 dark:text-blue-400 hover:underline">
            Export CSV
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()} className="text-blue-600 dark:text-blue-400 hover:underline">
            Import
          </button>
          <button type="button" onClick={handleLogout} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            Sign out
          </button>
        </nav>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Import todos from a JSON export"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = '';
          }}
        />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {permission === 'default' && (
          <button
            type="button"
            onClick={requestPermission}
            className="w-full text-sm text-left rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            🔔 Enable browser notifications to get todo reminders.
          </button>
        )}

        {banner && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
              banner.kind === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            }`}
          >
            <span className="flex-1">{banner.text}</span>
            <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss message">
              ✕
            </button>
          </div>
        )}

        <TodoForm allTags={tags} onSubmit={handleCreateTodo} />

        <FilterBar
          tags={tags}
          filters={filters}
          onChange={setFilters}
          totalCount={todos.length}
          filteredCount={visibleTodos.length}
        />

        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Loading...</p>
        ) : (
          <TodoList
            todos={visibleTodos}
            emptyMessage={
              hasActiveFilters(filters)
                ? 'No todos match these filters.'
                : 'No todos yet — add one above!'
            }
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteTodo}
            onRefresh={fetchTodos}
            onTagClick={handleTagClick}
          />
        )}
      </main>

      {showManageTags && (
        <ManageTagsModal
          tags={tags}
          onClose={() => setShowManageTags(false)}
          onCreate={handleCreateTag}
          onUpdate={handleUpdateTag}
          onDelete={handleDeleteTag}
        />
      )}

      {showTemplates && (
        <TemplatesModal
          templates={templates}
          onClose={() => setShowTemplates(false)}
          onCreate={handleCreateTemplate}
          onUse={handleUseTemplate}
          onDelete={handleDeleteTemplate}
        />
      )}
    </div>
  );
}
