'use client';

import { useState } from 'react';
import { Tag, Priority, CreateTodoDto } from '@/lib/types';
import TagSelector from '@/components/tags/TagSelector';

interface TodoFormProps {
  allTags: Tag[];
  onSubmit: (data: CreateTodoDto, tagIds: number[]) => Promise<void>;
}

export default function TodoForm({ allTags, onSubmit }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await onSubmit(
        { title: trimmed, priority, due_date: dueDate || null },
        selectedTagIds
      );
      setTitle('');
      setPriority('medium');
      setDueDate('');
      setSelectedTagIds([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-base font-semibold text-gray-800 dark:text-white">New Todo</h2>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        required
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          />
        </div>
      </div>

      {allTags.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</label>
          <TagSelector
            allTags={allTags}
            selectedIds={selectedTagIds}
            onToggle={handleToggleTag}
          />
        </div>
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
