import type { Priority, TodoWithDetails } from './types';
import { parseSingaporeDate } from './timezone';

export type CompletionFilter = 'all' | 'active' | 'completed';
export type PriorityFilter = 'all' | Priority;

export interface FilterState {
  search: string;
  priority: PriorityFilter;
  tagId: number | null;
  completion: CompletionFilter;
  dueDateFrom: string;
  dueDateTo: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  priority: 'all',
  tagId: null,
  completion: 'all',
  dueDateFrom: '',
  dueDateTo: '',
};

export const PRESETS_STORAGE_KEY = 'todo-app:filter-presets';

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

/** True when any criterion is narrower than the default. */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.priority !== 'all' ||
    filters.tagId !== null ||
    filters.completion !== 'all' ||
    filters.dueDateFrom !== '' ||
    filters.dueDateTo !== ''
  );
}

/** Search covers the todo title and every one of its subtask titles. */
function matchesSearch(todo: TodoWithDetails, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  if (todo.title.toLowerCase().includes(needle)) return true;
  return todo.subtasks.some((subtask) => subtask.title.toLowerCase().includes(needle));
}

function matchesDateRange(todo: TodoWithDetails, from: string, to: string): boolean {
  if (!from && !to) return true;
  // A range filter is a question about due dates, so undated todos drop out.
  if (!todo.due_date) return false;

  const due = parseSingaporeDate(todo.due_date).getTime();
  if (from && due < parseSingaporeDate(from).getTime()) return false;
  // `to` is inclusive of the whole day, so compare against its final minute.
  if (to && due > parseSingaporeDate(`${to}T23:59:59`).getTime()) return false;

  return true;
}

/**
 * Applies every criterion as an AND, in this fixed order:
 * search → priority → tag → completion → date range.
 */
export function applyFilters(
  todos: TodoWithDetails[],
  filters: FilterState
): TodoWithDetails[] {
  return todos
    .filter((todo) => matchesSearch(todo, filters.search))
    .filter((todo) => filters.priority === 'all' || todo.priority === filters.priority)
    .filter((todo) => filters.tagId === null || todo.tags.some((tag) => tag.id === filters.tagId))
    .filter((todo) => {
      if (filters.completion === 'all') return true;
      return filters.completion === 'completed' ? todo.completed : !todo.completed;
    })
    .filter((todo) => matchesDateRange(todo, filters.dueDateFrom, filters.dueDateTo));
}

// ─── Saved presets ────────────────────────────────────────────────────────────

function isFilterState(value: unknown): value is FilterState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.search === 'string' &&
    typeof candidate.priority === 'string' &&
    (candidate.tagId === null || typeof candidate.tagId === 'number') &&
    typeof candidate.completion === 'string' &&
    typeof candidate.dueDateFrom === 'string' &&
    typeof candidate.dueDateTo === 'string'
  );
}

export function loadPresets(): FilterPreset[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is FilterPreset =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as FilterPreset).id === 'string' &&
        typeof (entry as FilterPreset).name === 'string' &&
        isFilterState((entry as FilterPreset).filters)
    );
  } catch {
    // Corrupt or unreadable storage just means no saved presets.
    return [];
  }
}

export function savePresets(presets: FilterPreset[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage can be full or blocked; presets are a convenience, not critical state.
  }
}
