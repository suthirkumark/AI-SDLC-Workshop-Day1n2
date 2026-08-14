const SINGAPORE_TZ = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SINGAPORE_TZ }));
}

export function formatSingaporeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: SINGAPORE_TZ });
}

export function toSingaporeISOString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('sv-SE', { timeZone: SINGAPORE_TZ }).replace(' ', 'T');
}
