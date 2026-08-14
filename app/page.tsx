"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import { LogoutButton } from "@/components/LogoutButton";

type Priority = "high" | "medium" | "low";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: "daily" | "weekly" | "monthly" | "yearly" | null;
  reminder_minutes: number | null;
  subtasks: Array<{
    id: number;
    title: string;
    completed: boolean;
    position: number;
  }>;
  tags: Array<{ id: number; name: string; color: string }>;
}

interface TodoResponse {
  todos: Todo[];
}

interface Message {
  type: "success" | "error";
  text: string;
}

export default function Home() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todoCount = useMemo(() => todos.length, [todos]);

  const loadTodos = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch("/api/todos", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load todos");
      }

      const data = (await response.json()) as TodoResponse;
      setTodos(data.todos);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load todos"
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadTodos();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadTodos]);

  async function onCreateTodo(event: {
    preventDefault: () => void;
  }): Promise<void> {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setMessage({ type: "error", text: "Title is required" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const tags = tagInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((name) => ({ name, color: "#0d9488" }));

      const subtasks = subtaskInput
        .split("\n")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((subtaskTitle) => ({ title: subtaskTitle }));

      const payload = {
        title: normalizedTitle,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        subtasks,
        tags
      };

      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create todo");
      }

      setTitle("");
      setDueDate("");
      setTagInput("");
      setSubtaskInput("");
      setMessage({ type: "success", text: "Todo created" });
      await loadTodos();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create todo"
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onClearTodos(): Promise<void> {
    setMessage(null);
    const response = await fetch("/api/todos", { method: "DELETE" });
    if (!response.ok) {
      setMessage({ type: "error", text: "Failed to clear todos" });
      return;
    }

    setMessage({ type: "success", text: "All todos removed" });
    await loadTodos();
  }

  function download(format: "json" | "csv"): void {
    const link = document.createElement("a");
    link.href = `/api/todos/export?format=${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function onImportFile(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new SyntaxError("Invalid JSON format");
      }

      const response = await fetch("/api/todos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as {
        imported?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to import todos");
      }

      setMessage({
        type: "success",
        text: `Successfully imported ${data.imported ?? 0} todos`
      });
      await loadTodos();
    } catch (error) {
      setMessage({
        type: "error",
        text: getImportErrorMessage(error)
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function getImportErrorMessage(error: unknown): string {
    if (error instanceof SyntaxError) {
      return "Invalid JSON format";
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Failed to import todos";
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold">Todo Export & Import</h1>
          <p className="mt-2 text-sm text-slate-600">
            Import always adds new todos and does not merge with existing data.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => download("json")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => download("csv")}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-900"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              type="button"
              onClick={onClearTodos}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
            >
              Clear Todos
            </button>
            <LogoutButton className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" />
            <Link
              href="/calendar"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
            >
              Calendar
            </Link>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                void onImportFile(event);
              }}
            />
          </div>
          {message ? (
            <p
              className={`mt-4 text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-700"}`}
            >
              {message.text}
            </p>
          ) : null}
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <form
            onSubmit={(event) => {
              void onCreateTodo(event);
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">Create Todo</h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm">
                <span>Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Prepare project report"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-blue-500"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span>Priority</span>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as Priority)
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span>Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-blue-500"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span>Tags (comma separated)</span>
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  placeholder="Work, Finance"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-blue-500"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span>Subtasks (one per line)</span>
                <textarea
                  value={subtaskInput}
                  onChange={(event) => setSubtaskInput(event.target.value)}
                  rows={4}
                  placeholder="Draft summary\nReview by team"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-blue-500"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Add Todo"}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Todos ({todoCount})</h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading...</p>
            ) : null}
            {!loading && todos.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No todos yet. Create one to test export/import.
              </p>
            ) : null}
            <ul className="mt-4 space-y-3">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{todo.title}</p>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs uppercase tracking-wide text-slate-700">
                      {todo.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Due:{" "}
                    {todo.due_date
                      ? new Date(todo.due_date).toLocaleDateString()
                      : "-"}
                  </p>
                  {todo.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {todo.tags.map((tag) => (
                        <span
                          key={`${todo.id}-${tag.id}`}
                          className="rounded-md px-2 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {todo.subtasks.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {todo.subtasks.map((subtask) => (
                        <li key={subtask.id}>{subtask.title}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}
