const SINGAPORE_TIME_ZONE = "Asia/Singapore";

export function getSingaporeNow(): Date {
  return new Date();
}

export function formatSingaporeDate(date: Date, format: "yyyy-MM-dd"): string {
  if (format !== "yyyy-MM-dd") {
    throw new Error("Unsupported date format");
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SINGAPORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(date);
}

export function getSingaporeIsoTimestamp(date: Date): string {
  // Keep ISO 8601 format while representing the same moment in time.
  return date.toISOString();
}
