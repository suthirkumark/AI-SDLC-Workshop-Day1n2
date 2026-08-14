"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { formatTodoDueDate, generateCalendarGrid } from "@/lib/calendar";
import type { Holiday, TodoWithRelations } from "@/lib/db";
import { formatSingaporeDate, getSingaporeNow } from "@/lib/timezone";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_TODOS = 3;

interface TodoResponse {
  todos: TodoWithRelations[];
}

interface HolidayResponse {
  holidays: Holiday[];
}

interface SelectedDay {
  date: string;
  todos: TodoWithRelations[];
  holiday?: Holiday;
}

interface DayTodosModalProps {
  readonly selectedDay: SelectedDay;
  readonly onClose: () => void;
}

function parseMonthParam(raw: string | null): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const today = formatSingaporeDate(getSingaporeNow(), "yyyy-MM-dd");
  const [year, month] = today.split("-").map(Number);
  return { year, month };
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Singapore"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getAdjacentMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthPath(year: number, month: number): string {
  return `/calendar?month=${year}-${String(month).padStart(2, "0")}`;
}

function priorityClasses(priority: TodoWithRelations["priority"]): string {
  const classes = {
    high: "border-red-200 bg-red-50 text-red-800",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    low: "border-blue-200 bg-blue-50 text-blue-800"
  };

  return classes[priority];
}

export function CalendarView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { year, month } = parseMonthParam(searchParams.get("month"));
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const days = useMemo(() => generateCalendarGrid(year, month), [year, month]);

  const todosByDate = useMemo(() => {
    return todos.reduce<Record<string, TodoWithRelations[]>>(
      (grouped, todo) => {
        const date = formatTodoDueDate(todo.due_date);
        if (!date) {
          return grouped;
        }

        return {
          ...grouped,
          [date]: [...(grouped[date] ?? []), todo]
        };
      },
      {}
    );
  }, [todos]);

  const holidaysByDate = useMemo(() => {
    return holidays.reduce<Record<string, Holiday>>(
      (grouped, holiday) => ({ ...grouped, [holiday.date]: holiday }),
      {}
    );
  }, [holidays]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCalendarData(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [todoResponse, holidayResponse] = await Promise.all([
          fetch("/api/todos", { cache: "no-store", signal: controller.signal }),
          fetch(`/api/holidays?year=${year}&month=${month}`, {
            cache: "no-store",
            signal: controller.signal
          })
        ]);

        if (!todoResponse.ok || !holidayResponse.ok) {
          if (todoResponse.status === 401 || holidayResponse.status === 401) {
            router.replace("/login");
            return;
          }

          throw new Error("Failed to load calendar data");
        }

        const todoData = (await todoResponse.json()) as TodoResponse;
        const holidayData = (await holidayResponse.json()) as HolidayResponse;
        setTodos(todoData.todos);
        setHolidays(holidayData.holidays);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load calendar data"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCalendarData();

    return () => controller.abort();
  }, [year, month, router]);

  const previous = getAdjacentMonth(year, month, -1);
  const next = getAdjacentMonth(year, month, 1);
  const today = parseMonthParam(null);

  function selectDay(date: string): void {
    setSelectedDay({
      date,
      todos: todosByDate[date] ?? [],
      holiday: holidaysByDate[date]
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
            >
              Back to list
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Calendar
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Todos by Singapore due date, with public holidays overlaid.
            </p>
          </div>

          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Calendar navigation"
          >
            <Link
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100"
              href={monthPath(previous.year, previous.month)}
              replace
            >
              Previous
            </Link>
            <Link
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              href={monthPath(today.year, today.month)}
              replace
            >
              Today
            </Link>
            <Link
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100"
              href={monthPath(next.year, next.month)}
              replace
            >
              Next
            </Link>
            <LogoutButton className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" />
          </nav>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {monthLabel(year, month)}
              </h2>
              <p className="text-sm text-slate-500">
                Sun to Sat, fixed six-week grid
              </p>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading calendar...</p>
            ) : null}
            {error ? (
              <p className="text-sm font-medium text-red-700">{error}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-7 border-y border-l border-slate-200 text-center text-xs font-semibold uppercase text-slate-500">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="border-r border-slate-200 bg-slate-100 px-2 py-2"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-slate-200">
            {days.map((day) => {
              const dayTodos = todosByDate[day.date] ?? [];
              const visibleTodos = dayTodos.slice(0, MAX_VISIBLE_TODOS);
              const overflow = dayTodos.length - visibleTodos.length;
              const holiday = holidaysByDate[day.date];
              const ariaLabel = holiday
                ? `${day.date}, ${dayTodos.length} todos, ${holiday.name}`
                : `${day.date}, ${dayTodos.length} todos`;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => selectDay(day.date)}
                  className={`min-h-32 border-b border-r border-slate-200 p-2 text-left transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${day.isWeekend ? "bg-slate-50" : "bg-white"} ${day.isToday ? "ring-2 ring-inset ring-indigo-500" : ""} ${!day.isCurrentMonth ? "text-slate-400 opacity-70" : ""} ${day.isCurrentMonth && day.isPast ? "bg-slate-50 text-slate-500" : ""}`}
                  aria-label={ariaLabel}
                >
                  <span className="text-sm font-semibold">
                    {Number(day.date.slice(-2))}
                  </span>
                  <span className="mt-2 flex flex-col gap-1">
                    {holiday ? (
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                        {holiday.name}
                      </span>
                    ) : null}
                    {visibleTodos.map((todo) => (
                      <span
                        key={todo.id}
                        className={`truncate rounded-md border px-2 py-1 text-xs font-medium ${priorityClasses(todo.priority)} ${todo.completed ? "line-through opacity-65" : ""}`}
                      >
                        {todo.title}
                      </span>
                    ))}
                    {overflow > 0 ? (
                      <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                        +{overflow} more
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {selectedDay ? (
        <DayTodosModal
          selectedDay={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      ) : null}
    </main>
  );
}

function DayTodosModal({ selectedDay, onClose }: DayTodosModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="fixed inset-0 z-50 h-full w-full max-w-none bg-slate-950/50 px-4 backdrop:bg-transparent"
      aria-labelledby="calendar-day-title"
    >
      <div className="mx-auto mt-24 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="calendar-day-title" className="text-xl font-semibold">
              {selectedDay.date}
            </h2>
            {selectedDay.holiday ? (
              <p className="mt-1 text-sm font-medium text-emerald-700">
                {selectedDay.holiday.name}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {selectedDay.todos.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No todos due on this day.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {selectedDay.todos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={`font-medium ${todo.completed ? "line-through text-slate-500" : "text-slate-950"}`}
                  >
                    {todo.title}
                  </p>
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${priorityClasses(todo.priority)}`}
                  >
                    {todo.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {todo.completed ? "Completed" : "Open"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
