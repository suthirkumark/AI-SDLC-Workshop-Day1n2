import { formatSingaporeDate, getSingaporeNow } from "@/lib/timezone";

export interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

export function generateCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = formatSingaporeDate(getSingaporeNow(), "yyyy-MM-dd");

  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - startWeekday + 1;
    const cellDate = new Date(Date.UTC(year, month - 1, dayOffset));
    const date = formatSingaporeDate(cellDate, "yyyy-MM-dd");
    const weekday = cellDate.getUTCDay();

    return {
      date,
      isCurrentMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
      isToday: date === today,
      isPast: date < today,
      isWeekend: weekday === 0 || weekday === 6
    };
  });
}

export function formatTodoDueDate(dueDate: string | null): string | null {
  if (!dueDate) {
    return null;
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return /^\d{4}-\d{2}-\d{2}/.test(dueDate) ? dueDate.slice(0, 10) : null;
  }

  return formatSingaporeDate(parsed, "yyyy-MM-dd");
}