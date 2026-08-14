'use client';

import { useState } from 'react';
import { Tag, CreateTagInput, UpdateTagInput } from '@/lib/types';
import TagPill from './TagPill';

interface ManageTagsModalProps {
  tags: Tag[];
  onClose: () => void;
  onCreate: (input: CreateTagInput) => Promise<void>;
  onUpdate: (id: number, input: UpdateTagInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function ManageTagsModal({
  tags,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: ManageTagsModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Tag name is required'); return; }
    setError('');
    await onCreate({ name: trimmed, color });
    setName('');
    setColor('#3B82F6');
  };

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleUpdate = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await onUpdate(id, { name: trimmed, color: editColor });
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Tags"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Manage Tags</h2>

        <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {tags.length === 0 && (
            <li className="text-sm text-gray-400 dark:text-gray-500 italic">No tags yet.</li>
          )}
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-2">
              {editingId === tag.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                    title="Pick tag color"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(tag.id)}
                    className="text-sm text-green-600 dark:text-green-400 font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <TagPill tag={tag} selected />
                  <div className="flex gap-2 text-sm flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(tag)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(tag.id)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Tag name"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
            title="Pick tag color"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="bg-blue-600 text-white rounded px-3 py-1 text-sm hover:bg-blue-700 transition-colors"
          >
            Create Tag
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
