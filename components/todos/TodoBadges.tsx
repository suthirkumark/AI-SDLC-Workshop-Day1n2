'use client';

import type { Priority, RecurrencePattern } from '@/lib/types';
import { reminderLabel } from '@/lib/types';

const BADGE_BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

/**
 * Priority accents are red / amber / blue. The spec's light-mode hexes
 * (#EF4444, #F59E0B, #3B82F6) are used as the tint and dot accent rather than
 * as text on white — at text size none of them clear WCAG AA — so the label
 * itself uses the darker 700 shade. Dark mode uses the specified
 * #F87171 / #FBBF24 / #60A5FA, which do clear AA against a dark tint.
 */
const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const PRIORITY_DOTS: Record<Priority, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

export function priorityDot(priority: Priority): string {
  return PRIORITY_DOTS[priority] ?? PRIORITY_DOTS.medium;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`${BADGE_BASE} ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium}`}>
      {priority}
    </span>
  );
}

export function RecurrenceBadge({ pattern }: { pattern: RecurrencePattern }) {
  return (
    <span
      className={`${BADGE_BASE} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}
      title={`Repeats ${pattern}`}
    >
      🔄 {pattern}
    </span>
  );
}

export function ReminderBadge({ minutes }: { minutes: number }) {
  return (
    <span
      className={`${BADGE_BASE} bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300`}
      title={`Reminder ${reminderLabel(minutes)} before the due date`}
    >
      🔔 {reminderLabel(minutes)}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span
      className={`${BADGE_BASE} bg-red-600 text-white dark:bg-red-700`}
      title="This todo is past its due date"
    >
      Overdue
    </span>
  );
}
