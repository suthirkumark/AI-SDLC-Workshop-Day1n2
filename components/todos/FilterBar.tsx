'use client';

import { useRef, useState, useEffect } from 'react';
import { Tag } from '@/lib/types';

interface FilterBarProps {
  tags: Tag[];
  activeTagId: number | null;
  onTagChange: (tagId: number | null) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({
  tags,
  activeTagId,
  onTagChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeTag = tags.find((t) => t.id === activeTagId) ?? null;
  const isFiltered = activeTagId !== null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tag filter dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isFiltered
              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
              : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200'
          }`}
        >
          {activeTag ? (
            <>
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: activeTag.color }}
              />
              <span className="max-w-[120px] truncate">{activeTag.name}</span>
            </>
          ) : (
            <>
              <TagIcon />
              <span>All Tags</span>
            </>
          )}
          <ChevronIcon open={open} />
        </button>

        {open && (
          <ul
            role="listbox"
            aria-label="Filter by tag"
            className="absolute left-0 top-full mt-1 z-30 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={activeTagId === null}
                onClick={() => { onTagChange(null); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  activeTagId === null ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                All Tags
                {activeTagId === null && <CheckIcon />}
              </button>
            </li>

            {tags.length > 0 && (
              <li aria-hidden className="my-1 border-t border-gray-100 dark:border-gray-700" />
            )}

            {tags.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activeTagId === tag.id}
                  onClick={() => { onTagChange(tag.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    activeTagId === tag.id ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {activeTagId === tag.id && <CheckIcon />}
                </button>
              </li>
            ))}

            {tags.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic">
                No tags yet
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Active filter badge + clear */}
      {isFiltered && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {filteredCount} of {totalCount} todo{totalCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => onTagChange(null)}
            title="Clear filter"
            className="inline-flex items-center gap-1 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear ×
          </button>
        </div>
      )}

      {/* Todo count when no filter */}
      {!isFiltered && totalCount > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {totalCount} todo{totalCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function TagIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
