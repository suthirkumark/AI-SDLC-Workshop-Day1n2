'use client';

import { useState } from 'react';
import { Subtask, calculateProgress } from '@/lib/types';
import ProgressBar from './ProgressBar';
import SubtaskItem from './SubtaskItem';

interface SubtaskListProps {
  todoId: number;
  subtasks: Subtask[];
  onChange: () => void;
}

export default function SubtaskList({ todoId, subtasks, onChange }: SubtaskListProps) {
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const { completed, total, percent } = calculateProgress(subtasks);

  const addSubtask = async () => {
    const title = newTitle.trim();
    if (!title) return;

    await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setNewTitle('');
    onChange();
  };

  const toggleSubtask = async (subtask: Subtask) => {
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !subtask.completed }),
    });
    onChange();
  };

  const deleteSubtask = async (id: number) => {
    await fetch(`/api/subtasks/${id}`, { method: 'DELETE' });
    onChange();
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        aria-expanded={expanded}
      >
        {expanded ? '▼' : '▶'} Subtasks
      </button>

      <ProgressBar completed={completed} total={total} percent={percent} />

      {expanded && (
        <div className="mt-2 space-y-2 pl-4">
          {subtasks.map((s) => (
            <SubtaskItem
              key={s.id}
              subtask={s}
              onToggle={toggleSubtask}
              onDelete={deleteSubtask}
            />
          ))}

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              placeholder="Add subtask..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addSubtask}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 px-2 py-1 rounded border border-blue-300 dark:border-blue-600"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
