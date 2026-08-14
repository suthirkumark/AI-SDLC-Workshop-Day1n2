'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Holiday, Priority, TodoWithDetails } from '@/lib/types';
import {
  generateCalendarGrid,
  parseMonthParam,
  shiftMonth,
  toMonthParam,
  WEEKDAY_LABELS,
} from '@/lib/calendar';
import { getSingaporeNow } from '@/lib/timezone';
import DayTodosModal from './DayTodosModal';

const MAX_PILLS_PER_CELL = 3;

const PILL_STYLES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

interface CalendarViewProps {
  /** Raw `?month=` value; anything invalid falls back to the current month. */
  monthParam: string | null;
}

export default function CalendarView({ monthParam }: CalendarViewProps) {
  const router = useRouter();

  const [todos, setTodos] = useState<TodoWithDetails[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month } = parseMonthParam(monthParam);
  const grid = useMemo(() => generateCalendarGrid(year, month), [year, month]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/todos');
        setTodos(res.ok ? await res.json() : []);
      } catch {
        setTodos([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/holidays?year=${year}&month=${month + 1}`);
        const data = res.ok ? await res.json() : { holidays: [] };
        setHolidays(data.holidays ?? []);
      } catch {
        setHolidays([]);
      }
    };
    load();
  }, [year, month]);

  // Todos are bucketed by the date portion of their due date, so a 00:30
  // Singapore due time lands on that day's cell rather than the previous one.
  const todosByDate = useMemo(() => {
    const map = new Map<string, TodoWithDetails[]>();
    for (const todo of todos) {
      if (!todo.due_date) continue;
      const key = todo.due_date.slice(0, 10);
      const bucket = map.get(key);
      if (bucket) bucket.push(todo);
      else map.set(key, [todo]);
    }
    return map;
  }, [todos]);

  const holidaysByDate = useMemo(() => new Map(holidays.map((h) => [h.date, h])), [holidays]);

  const goToMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    router.push(`/calendar?month=${toMonthParam(next.year, next.month)}`);
  };

  const goToToday = () => {
    const now = getSingaporeNow();
    router.push(`/calendar?month=${toMonthParam(now.getFullYear(), now.getMonth())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">Calendar</h1>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Back to todos
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ‹ Prev
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">{grid.label}</h2>
            <button
              type="button"
              onClick={goToToday}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Next ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-gray-50 dark:bg-gray-800 px-2 py-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400"
            >
              {label}
            </div>
          ))}

          {grid.weeks.flat().map((day) => {
            const dayTodos = todosByDate.get(day.date) ?? [];
            const holiday = holidaysByDate.get(day.date);
            const overflow = dayTodos.length - MAX_PILLS_PER_CELL;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                aria-label={`${day.date}${holiday ? `, ${holiday.name}` : ''}, ${dayTodos.length} todo${dayTodos.length !== 1 ? 's' : ''}`}
                className={`min-h-[88px] p-1 text-left align-top transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  day.inCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/60'
                } ${day.isWeekend && day.inCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-800/70' : ''}`}
              >
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full text-xs ${
                    day.isToday
                      ? 'bg-blue-600 text-white font-semibold'
                      : day.inCurrentMonth
                        ? day.isPast
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-700 dark:text-gray-200'
                        : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {day.day}
                </span>

                {holiday && (
                  <span className="block truncate text-[10px] leading-tight text-emerald-700 dark:text-emerald-400">
                    {holiday.name}
                  </span>
                )}

                <span className="block space-y-0.5 mt-0.5">
                  {dayTodos.slice(0, MAX_PILLS_PER_CELL).map((todo) => (
                    <span
                      key={todo.id}
                      className={`block truncate rounded px-1 text-[10px] leading-tight ${PILL_STYLES[todo.priority]} ${
                        todo.completed ? 'line-through opacity-60' : ''
                      }`}
                    >
                      {todo.title}
                    </span>
                  ))}

                  {overflow > 0 && (
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                      +{overflow} more
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {selectedDate && (
        <DayTodosModal
          date={selectedDate}
          todos={todosByDate.get(selectedDate) ?? []}
          holiday={holidaysByDate.get(selectedDate)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
