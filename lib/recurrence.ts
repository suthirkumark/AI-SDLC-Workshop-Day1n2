import type { RecurrencePattern } from './types';
import {
  addDays,
  daysInSingaporeMonth,
  formatSingaporeDate,
  formatSingaporeDateTime,
  parseSingaporeDate,
  singaporeDateFrom,
} from './timezone';

/**
 * The due date of the next instance of a recurring todo.
 *
 * Day-of-month is clamped when the target month is shorter, so Jan 31 rolls to
 * Feb 28 (or 29 in a leap year) rather than overflowing into March. Yearly
 * recurrence of Feb 29 lands on Feb 28 in non-leap years. Time of day is
 * preserved, and the returned string keeps the granularity of the input —
 * a date-only due date stays date-only.
 *
 * All arithmetic runs on Singapore wall-clock fields via `lib/timezone.ts`, so
 * a DST transition in the server's own timezone cannot shift the result.
 */
export function calculateNextDueDate(
  currentDueDate: string,
  pattern: RecurrencePattern
): string {
  const current = parseSingaporeDate(currentDueDate);
  const hasTime = currentDueDate.includes('T');

  let next: Date;

  switch (pattern) {
    case 'daily':
      next = addDays(current, 1);
      break;

    case 'weekly':
      next = addDays(current, 7);
      break;

    case 'monthly': {
      const month = current.getUTCMonth() + 1;
      const targetYear = current.getUTCFullYear() + (month > 11 ? 1 : 0);
      const targetMonth = month % 12;
      next = singaporeDateFrom(
        targetYear,
        targetMonth,
        Math.min(current.getUTCDate(), daysInSingaporeMonth(targetYear, targetMonth)),
        current.getUTCHours(),
        current.getUTCMinutes(),
        current.getUTCSeconds()
      );
      break;
    }

    case 'yearly': {
      const targetYear = current.getUTCFullYear() + 1;
      const targetMonth = current.getUTCMonth();
      next = singaporeDateFrom(
        targetYear,
        targetMonth,
        Math.min(current.getUTCDate(), daysInSingaporeMonth(targetYear, targetMonth)),
        current.getUTCHours(),
        current.getUTCMinutes(),
        current.getUTCSeconds()
      );
      break;
    }
  }

  return hasTime ? formatSingaporeDateTime(next) : formatSingaporeDate(next);
}
