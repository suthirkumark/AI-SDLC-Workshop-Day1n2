'use client';

import { Tag } from '@/lib/types';
import TagPill from './TagPill';

interface TagSelectorProps {
  allTags: Tag[];
  selectedIds: number[];
  onToggle: (tagId: number) => void;
}

export default function TagSelector({ allTags, selectedIds, onToggle }: TagSelectorProps) {
  if (allTags.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        No tags yet — create some in Manage Tags.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((tag) => (
        <TagPill
          key={tag.id}
          tag={tag}
          selected={selectedIds.includes(tag.id)}
          onClick={() => onToggle(tag.id)}
        />
      ))}
    </div>
  );
}
