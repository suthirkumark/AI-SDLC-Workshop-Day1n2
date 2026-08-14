const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Returns the current time as a Date whose UTC value reflects now,
 * but helper functions treat it as Singapore local time.
 */
export function getSingaporeNow(): Date {
  return new Date();
}

/**
 * Formats a Date (or ISO string) in Singapore timezone.
 */
export function formatSingaporeDate(
  date: Date | string,
  format: 'datetime' | 'date' | 'time' = 'datetime'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions =
    format === 'date'
      ? { timeZone: SINGAPORE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }
      : format === 'time'
      ? { timeZone: SINGAPORE_TZ, hour: '2-digit', minute: '2-digit' }
      : {
          timeZone: SINGAPORE_TZ,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        };
  return new Intl.DateTimeFormat('en-SG', options).format(d);
}

/**
 * Returns a new Date that is `minutes` from `date`.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export { SINGAPORE_TZ };
