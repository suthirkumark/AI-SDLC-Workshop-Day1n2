'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Tag } from '@/lib/types';
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  loadPresets,
  savePresets,
  type CompletionFilter,
  type FilterPreset,
  type FilterState,
  type PriorityFilter,
} from '@/lib/filters';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface FilterBarProps {
  tags: Tag[];
  filters: FilterState;
  /** Accepts an updater so the debounced search can patch the latest filters. */
  onChange: Dispatch<SetStateAction<FilterState>>;
  totalCount: number;
  filteredCount: number;
}

const CONTROL_CLASS =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function FilterBar({
  tags,
  filters,
  onChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState('');

  const debouncedSearch = useDebounce(searchInput, 300);

  // Patch the latest filters rather than the ones captured when this effect was
  // scheduled, and bail when nothing changed so it can't ping-pong.
  useEffect(() => {
    onChange((prev) =>
      prev.search === debouncedSearch ? prev : { ...prev, search: debouncedSearch }
    );
  }, [debouncedSearch, onChange]);

  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  // Presets live in localStorage; reading them when the panel opens keeps the
  // first render identical on server and client.
  const toggleAdvanced = () => {
    if (!showAdvanced) setPresets(loadPresets());
    setShowAdvanced((open) => !open);
  };

  const clearAll = () => {
    setSearchInput('');
    onChange(EMPTY_FILTERS);
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;

    const next = [
      ...presets.filter((p) => p.name.toLowerCase() !== name.toLowerCase()),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      },
    ];

    setPresets(next);
    savePresets(next);
    setPresetName('');
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    setSearchInput(preset.filters.search);
    onChange(preset.filters);
  };

  const handleDeletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
  };

  const isFiltered = hasActiveFilters(filters);

  return (
    <div className="space-y-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search todos and subtasks…"
          aria-label="Search todos and subtasks"
          className={`${CONTROL_CLASS} flex-1 min-w-[180px]`}
        />

        <select
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(e) => update({ priority: e.target.value as PriorityFilter })}
          className={CONTROL_CLASS}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          aria-label="Filter by tag"
          value={filters.tagId ?? ''}
          onChange={(e) => update({ tagId: e.target.value ? Number(e.target.value) : null })}
          className={CONTROL_CLASS}
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by completion"
          value={filters.completion}
          onChange={(e) => update({ completion: e.target.value as CompletionFilter })}
          className={CONTROL_CLASS}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>

        <button
          type="button"
          onClick={toggleAdvanced}
          aria-expanded={showAdvanced}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline px-1"
        >
          {showAdvanced ? 'Less' : 'More'}
        </button>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
          <div>
            <label htmlFor="due-from" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Due from
            </label>
            <input
              id="due-from"
              type="date"
              value={filters.dueDateFrom}
              onChange={(e) => update({ dueDateFrom: e.target.value })}
              className={CONTROL_CLASS}
            />
          </div>

          <div>
            <label htmlFor="due-to" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Due to
            </label>
            <input
              id="due-to"
              type="date"
              value={filters.dueDateTo}
              onChange={(e) => update({ dueDateTo: e.target.value })}
              className={CONTROL_CLASS}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label htmlFor="preset-name" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Save current filters
            </label>
            <div className="flex gap-2">
              <input
                id="preset-name"
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                placeholder="Preset name"
                className={`${CONTROL_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline px-1"
              >
                Save
              </button>
            </div>
          </div>

          {presets.length > 0 && (
            <div className="w-full">
              <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Saved presets
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <span
                    key={preset.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 pl-3 pr-1 py-0.5 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-gray-700 dark:text-gray-200 hover:underline"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      aria-label={`Delete preset "${preset.name}"`}
                      className="text-gray-400 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {isFiltered
            ? `${filteredCount} of ${totalCount} todo${totalCount !== 1 ? 's' : ''}`
            : `${totalCount} todo${totalCount !== 1 ? 's' : ''}`}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear filters ×
          </button>
        )}
      </div>
    </div>
  );
}
