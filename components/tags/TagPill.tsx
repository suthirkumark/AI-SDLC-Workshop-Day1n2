'use client';

import { Tag } from '@/lib/types';

interface TagPillProps {
  tag: Tag;
  selected?: boolean;
  onClick?: (tag: Tag) => void;
  showDot?: boolean;
}

export default function TagPill({ tag, selected = false, onClick, showDot = false }: TagPillProps) {
  const baseClass =
    'inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-medium border transition-colors cursor-pointer';

  const selectedClass = 'text-white border-transparent';
  const unselectedClass =
    'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-gray-400';

  return (
    <button
      type="button"
      onClick={() => onClick?.(tag)}
      style={selected ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
      className={`${baseClass} ${selected ? selectedClass : unselectedClass}`}
      title={tag.name}
    >
      {showDot && (
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: selected ? 'white' : tag.color }}
          aria-hidden
        />
      )}
      {selected && !showDot && <span aria-hidden>✓</span>}
      <span className="truncate max-w-[10rem]">{tag.name}</span>
    </button>
  );
}
