// All date/time handling in this app is Singapore-local. Dates are persisted as
// "wall clock" strings — 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm' — with no offset or
// zone suffix.
//
// Internally a Singapore wall clock is carried in a Date whose *UTC* fields hold
// the Singapore year/month/day/hour/minute. UTC is used purely as a DST-free
// container: it makes every calculation here independent of whatever timezone
// the server happens to run in. Using the local-time getters/setters instead
// would corrupt any Singapore time that does not exist in the server's own zone
// (e.g. 02:30 on a US spring-forward date), shifting it by an hour.
//
// Consequence for callers: read these Dates only through the helpers below, and
// never with getHours()/getDate() or a bare toLocaleString().
//
// Never call `new Date()` directly elsewhere; use `getSingaporeNow()`.

const SINGAPORE_TZ = 'Asia/Singapore';

const pad = (n: number) => String(n).padStart(2, '0');

const singaporeParts = new Intl.DateTimeFormat('en-US', {
  timeZone: SINGAPORE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Current time as a wall-clock Date holding Singapore fields. */
export function getSingaporeNow(): Date {
  const parts = singaporeParts.formatToParts(new Date());
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  return new Date(
    Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second')
    )
  );
}

const WALL_CLOCK_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * Parse a stored Singapore-local string into a wall-clock Date.
 * A bare 'YYYY-MM-DD' is treated as midnight — `new Date('2026-08-20')` would
 * otherwise parse as UTC midnight and shift the day in western timezones.
 */
export function parseSingaporeDate(value: string): Date {
  const match = WALL_CLOCK_RE.exec(value.trim());
  if (!match) return new Date(NaN);

  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0)
    )
  );
}

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? parseSingaporeDate(value) : value;
}

/** Builds a wall-clock Date from Singapore calendar fields. */
export function singaporeDateFrom(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date {
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/** Days in a Singapore calendar month, where `month` is 0-indexed. */
export function daysInSingaporeMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** 'YYYY-MM-DD' — the date portion only. */
export function formatSingaporeDate(value: Date | string): string {
  const d = toDate(value);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 'YYYY-MM-DDTHH:mm' — the canonical storage format for `due_date`. */
export function formatSingaporeDateTime(value: Date | string): string {
  const d = toDate(value);
  return `${formatSingaporeDate(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Human-readable Singapore date/time, e.g. '20 Aug 2026, 9:30 am'. */
export function formatSingaporeDisplay(value: Date | string): string {
  const d = toDate(value);
  // timeZone: 'UTC' reads back the wall-clock fields exactly as stored.
  const datePart = d.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const hasTime = typeof value !== 'string' || value.includes('T');
  if (!hasTime) return datePart;

  const timePart = d.toLocaleTimeString('en-GB', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

export function addMinutes(value: Date | string, minutes: number): Date {
  const d = new Date(toDate(value).getTime());
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d;
}

export function addDays(value: Date | string, days: number): Date {
  const d = new Date(toDate(value).getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** True when `value` falls strictly before `reference` (defaults to now). */
export function isBeforeNow(value: Date | string, reference: Date = getSingaporeNow()): boolean {
  return toDate(value).getTime() < reference.getTime();
}

export { SINGAPORE_TZ };
