'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo, Holiday } from '@/lib/db';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const router = useRouter();
  const [today] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) setTodos(await res.json());
  }, []);

  const fetchHolidays = useCallback(async () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const res = await fetch(`/api/holidays?year=${year}&month=${month}`);
    if (res.ok) setHolidays(await res.json());
  }, [viewDate]);

  useEffect(() => {
    fetch('/api/auth/me').then((res) => {
      if (!res.ok) router.replace('/login');
    });
    fetchTodos();
    fetchHolidays();
  }, [router, fetchTodos, fetchHolidays]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function todosForDay(day: number): Todo[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return todos.filter((t) => t.due_date?.startsWith(dateStr));
  }

  function holidayForDay(day: number): Holiday | undefined {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find((h) => h.date === dateStr);
  }

  function isToday(day: number): boolean {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  }

  const monthName = viewDate.toLocaleString('en-SG', { month: 'long', year: 'numeric' });

  const selectedTodos = selectedDay
    ? todosForDay(selectedDay.getDate())
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Nav */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              ← Todos
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">📅 Calendar</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ‹
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{monthName}</h2>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50 dark:bg-gray-800 min-h-[80px]" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayTodos = todosForDay(day);
            const holiday = holidayForDay(day);
            const todayCell = isToday(day);
            const selected =
              selectedDay?.getDate() === day &&
              selectedDay?.getMonth() === month &&
              selectedDay?.getFullYear() === year;

            return (
              <button
                key={day}
                onClick={() => {
                  const d = new Date(year, month, day);
                  setSelectedDay((prev) =>
                    prev?.getTime() === d.getTime() ? null : d
                  );
                }}
                className={`bg-white dark:bg-gray-800 min-h-[80px] p-1.5 text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  selected ? 'ring-2 ring-inset ring-blue-500' : ''
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium mb-1 ${
                    todayCell
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </span>
                {holiday && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 truncate">
                    🎉 {holiday.name}
                  </p>
                )}
                {dayTodos.slice(0, 3).map((t) => (
                  <p
                    key={t.id}
                    className={`text-xs truncate rounded px-0.5 ${
                      t.completed
                        ? 'line-through text-gray-400'
                        : t.priority === 'high'
                        ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : t.priority === 'medium'
                        ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    }`}
                  >
                    {t.title}
                  </p>
                ))}
                {dayTodos.length > 3 && (
                  <p className="text-xs text-gray-400">+{dayTodos.length - 3} more</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day todos */}
        {selectedDay && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {selectedDay.toLocaleDateString('en-SG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Singapore',
              })}
            </h3>
            {selectedTodos.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">No todos due this day.</p>
            ) : (
              <ul className="space-y-2">
                {selectedTodos.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex-1 text-sm ${
                          t.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          t.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : t.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    {t.due_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.due_date).toLocaleTimeString('en-SG', {
                          timeZone: 'Asia/Singapore',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
