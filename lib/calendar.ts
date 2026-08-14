import {
  addDays,
  daysInSingaporeMonth,
  formatSingaporeDate,
  getSingaporeNow,
  singaporeDateFrom,
} from './timezone';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MIN_YEAR = 1970;
const MAX_YEAR = 2100;

export interface CalendarDay {
  /** 'YYYY-MM-DD', Singapore local. */
  date: string;
  day: number;
  /** False for the leading/trailing days borrowed from adjacent months. */
  inCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

export interface CalendarMonth {
  year: number;
  /** 0-indexed, matching `Date.prototype.getMonth`. */
  month: number;
  label: string;
  weeks: CalendarDay[][];
  /** Inclusive 'YYYY-MM-DD' bounds covering the whole grid, adjacent days included. */
  rangeStart: string;
  rangeEnd: string;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month]} ${year}`;
}

/** 'YYYY-MM' — the value carried in the `?month=` query parameter. */
export function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Steps `delta` months from the given month, rolling the year over as needed. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/**
 * Reads `?month=YYYY-MM`. Anything malformed or outside the supported year
 * range falls back to the current Singapore month.
 */
export function parseMonthParam(
  value: string | null | undefined,
  now: Date = getSingaporeNow()
): { year: number; month: number } {
  const fallback = { year: now.getFullYear(), month: now.getMonth() };
  if (!value) return fallback;

  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return fallback;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  if (year < MIN_YEAR || year > MAX_YEAR) return fallback;
  if (month < 0 || month > 11) return fallback;

  return { year, month };
}

/**
 * Builds a full Sunday-start grid for the month — always whole weeks, so 5 or 6
 * rows depending on where the month falls. Leading and trailing cells carry
 * real dates from the adjacent months with `inCurrentMonth: false`.
 */
export function generateCalendarGrid(
  year: number,
  month: number,
  now: Date = getSingaporeNow()
): CalendarMonth {
  const today = formatSingaporeDate(now);
  const firstOfMonth = singaporeDateFrom(year, month, 1);
  const leadingDays = firstOfMonth.getUTCDay();
  const gridStart = addDays(firstOfMonth, -leadingDays);

  const totalCells = Math.ceil((leadingDays + daysInSingaporeMonth(year, month)) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];

  for (let offset = 0; offset < totalCells; offset += 1) {
    const cursor = addDays(gridStart, offset);
    const date = formatSingaporeDate(cursor);
    const weekday = cursor.getUTCDay();

    week.push({
      date,
      day: cursor.getUTCDate(),
      inCurrentMonth: cursor.getUTCMonth() === month && cursor.getUTCFullYear() === year,
      isToday: date === today,
      isPast: date < today,
      isWeekend: weekday === 0 || weekday === 6,
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  return {
    year,
    month,
    label: monthLabel(year, month),
    weeks,
    rangeStart: weeks[0][0].date,
    rangeEnd: weeks[weeks.length - 1][6].date,
  };
}
