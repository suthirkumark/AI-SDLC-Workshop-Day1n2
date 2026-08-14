import Database from "better-sqlite3";
import path from "node:path";

import { getSingaporeIsoTimestamp, getSingaporeNow } from "@/lib/timezone";

export type Priority = "high" | "medium" | "low";
export type RecurrencePattern = "daily" | "weekly" | "monthly" | "yearly";

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: Buffer;
  counter: number;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  created_at: string;
}

export interface TodoWithRelations extends Todo {
  subtasks: Subtask[];
  tags: Tag[];
}

export interface TodoExportItem {
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  created_at: string;
  subtasks: Array<{ title: string; completed: boolean; position: number }>;
  tags: Array<{ name: string; color: string }>;
}

export interface ImportResult {
  imported: number;
  tagsCreated: number;
  tagsReused: number;
}

interface CreateTodoInput {
  title: string;
  completed?: boolean;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  subtasks?: Array<{ title: string; completed?: boolean }>;
  tags?: Array<{ name: string; color?: string }>;
}

const DATABASE_PATH = path.join(process.cwd(), "todos.db");
const db = new Database(DATABASE_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY(todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
`);

function applyMigration(sql: string): void {
  try {
    db.exec(sql);
  } catch {
    // Ignore migration if column already exists.
  }
}

applyMigration(
  "ALTER TABLE todos ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0"
);
applyMigration("ALTER TABLE todos ADD COLUMN recurrence_pattern TEXT");
applyMigration("ALTER TABLE todos ADD COLUMN reminder_minutes INTEGER");
applyMigration("ALTER TABLE todos ADD COLUMN last_notification_sent TEXT");

const createUserStmt = db.prepare(
  "INSERT INTO users (username, created_at) VALUES (?, ?)"
);
const findUserByIdStmt = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
const findUserByUsernameStmt = db.prepare(
  "SELECT * FROM users WHERE username = ? LIMIT 1"
);
const createAuthenticatorStmt = db.prepare(`
  INSERT INTO authenticators (
    user_id, credential_id, credential_public_key, counter, created_at
  ) VALUES (?, ?, ?, ?, ?)
`);
const findAuthenticatorByCredentialIdStmt = db.prepare(
  "SELECT * FROM authenticators WHERE credential_id = ? LIMIT 1"
);
const findAuthenticatorsByUserIdStmt = db.prepare(
  "SELECT * FROM authenticators WHERE user_id = ? ORDER BY id ASC"
);
const updateAuthenticatorCounterStmt = db.prepare(
  "UPDATE authenticators SET counter = ? WHERE id = ?"
);
const insertTodoStmt = db.prepare(`
  INSERT INTO todos (
    user_id, title, completed, due_date, priority, is_recurring, recurrence_pattern,
    reminder_minutes, last_notification_sent, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSubtaskStmt = db.prepare(
  "INSERT INTO subtasks (todo_id, title, completed, position, created_at) VALUES (?, ?, ?, ?, ?)"
);
const findTagByNameCIStmt = db.prepare(
  "SELECT id FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?) LIMIT 1"
);
const insertTagStmt = db.prepare(
  "INSERT INTO tags (user_id, name, color, created_at) VALUES (?, ?, ?, ?)"
);
const linkTodoTagStmt = db.prepare(
  "INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)"
);
const listTodosStmt = db.prepare(
  "SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC, id DESC"
);
const getTodoByIdStmt = db.prepare("SELECT * FROM todos WHERE id = ? LIMIT 1");
const listSubtasksStmt = db.prepare(
  "SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC, id ASC"
);
const listTagsStmt = db.prepare(`
  SELECT t.*
  FROM tags t
  JOIN todo_tags tt ON tt.tag_id = t.id
  WHERE tt.todo_id = ?
  ORDER BY t.name COLLATE NOCASE ASC
`);
const clearTodosStmt = db.prepare("DELETE FROM todos WHERE user_id = ?");
const listHolidaysStmt = db.prepare("SELECT * FROM holidays ORDER BY date ASC");
const listHolidaysByRangeStmt = db.prepare(
  "SELECT * FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date ASC"
);
const upsertHolidayStmt = db.prepare(`
  INSERT INTO holidays (date, name, created_at)
  VALUES (?, ?, ?)
  ON CONFLICT(date) DO UPDATE SET name = excluded.name
`);

function toBool(value: number): boolean {
  return value === 1;
}

function mapTodo(row: Record<string, unknown>): Todo {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    title: row.title as string,
    completed: toBool(row.completed as number),
    due_date: (row.due_date as string | null) ?? null,
    priority: row.priority as Priority,
    is_recurring: toBool(row.is_recurring as number),
    recurrence_pattern:
      (row.recurrence_pattern as RecurrencePattern | null) ?? null,
    reminder_minutes: (row.reminder_minutes as number | null) ?? null,
    last_notification_sent:
      (row.last_notification_sent as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  };
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    username: row.username as string,
    created_at: row.created_at as string
  };
}

function mapAuthenticator(row: Record<string, unknown>): Authenticator {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    credential_id: row.credential_id as string,
    credential_public_key: row.credential_public_key as Buffer,
    counter: (row.counter as number | null | undefined) ?? 0,
    created_at: row.created_at as string
  };
}

function mapSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id as number,
    todo_id: row.todo_id as number,
    title: row.title as string,
    completed: toBool(row.completed as number),
    position: row.position as number,
    created_at: row.created_at as string
  };
}

function mapTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    name: row.name as string,
    color: row.color as string,
    created_at: row.created_at as string
  };
}

function mapHoliday(row: Record<string, unknown>): Holiday {
  return {
    id: row.id as number,
    date: row.date as string,
    name: row.name as string,
    created_at: row.created_at as string
  };
}

function createUser(username: string): User {
  const normalizedUsername = username.trim();
  const now = getSingaporeIsoTimestamp(getSingaporeNow());

  const result = createUserStmt.run(normalizedUsername, now);
  const user = findUserById(Number(result.lastInsertRowid));

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

function findUserById(userId: number): User | null {
  const row = findUserByIdStmt.get(userId) as
    | Record<string, unknown>
    | undefined;
  return row ? mapUser(row) : null;
}

function findUserByUsername(username: string): User | null {
  const row = findUserByUsernameStmt.get(username) as
    | Record<string, unknown>
    | undefined;
  return row ? mapUser(row) : null;
}

function createAuthenticator(input: {
  user_id: number;
  credential_id: string;
  credential_public_key: Uint8Array;
  counter?: number;
}): Authenticator {
  const now = getSingaporeIsoTimestamp(getSingaporeNow());
  const result = createAuthenticatorStmt.run(
    input.user_id,
    input.credential_id,
    input.credential_public_key,
    input.counter ?? 0,
    now
  );

  const created = findAuthenticatorById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to create authenticator");
  }

  return created;
}

function findAuthenticatorById(id: number): Authenticator | null {
  const row = db
    .prepare("SELECT * FROM authenticators WHERE id = ? LIMIT 1")
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapAuthenticator(row) : null;
}

function findAuthenticatorByCredentialId(
  credentialId: string
): Authenticator | null {
  const row = findAuthenticatorByCredentialIdStmt.get(credentialId) as
    | Record<string, unknown>
    | undefined;
  return row ? mapAuthenticator(row) : null;
}

function findAuthenticatorsByUserId(userId: number): Authenticator[] {
  const rows = findAuthenticatorsByUserIdStmt.all(userId) as Array<
    Record<string, unknown>
  >;

  return rows.map(mapAuthenticator);
}

function updateAuthenticatorCounter(
  authenticatorId: number,
  counter: number
): void {
  updateAuthenticatorCounterStmt.run(counter ?? 0, authenticatorId);
}

function listWithRelations(userId: number): TodoWithRelations[] {
  const todoRows = listTodosStmt.all(userId) as Array<Record<string, unknown>>;

  return todoRows.map((todoRow) => {
    const todo = mapTodo(todoRow);
    const subtasks = (
      listSubtasksStmt.all(todo.id) as Array<Record<string, unknown>>
    ).map(mapSubtask);
    const tags = (
      listTagsStmt.all(todo.id) as Array<Record<string, unknown>>
    ).map(mapTag);

    return {
      ...todo,
      subtasks,
      tags
    };
  });
}

function createTodo(userId: number, input: CreateTodoInput): TodoWithRelations {
  const now = getSingaporeIsoTimestamp(getSingaporeNow());

  const todoId = Number(
    insertTodoStmt.run(
      userId,
      input.title,
      input.completed ? 1 : 0,
      input.due_date ?? null,
      input.priority ?? "medium",
      input.is_recurring ? 1 : 0,
      input.recurrence_pattern ?? null,
      input.reminder_minutes ?? null,
      null,
      now,
      now
    ).lastInsertRowid
  );

  const subtasks = (input.subtasks ?? [])
    .map((subtask, index) => ({
      title: subtask.title.trim(),
      completed: subtask.completed ?? false,
      position: index
    }))
    .filter((subtask) => subtask.title.length > 0);

  for (const subtask of subtasks) {
    insertSubtaskStmt.run(
      todoId,
      subtask.title,
      subtask.completed ? 1 : 0,
      subtask.position,
      now
    );
  }

  const tags = (input.tags ?? [])
    .map((tag) => ({
      name: tag.name.trim(),
      color: tag.color ?? "#3b82f6"
    }))
    .filter((tag) => tag.name.length > 0);

  for (const tag of tags) {
    const existing = findTagByNameCIStmt.get(userId, tag.name) as
      | { id: number }
      | undefined;
    const tagId = existing
      ? existing.id
      : Number(
          insertTagStmt.run(userId, tag.name, tag.color, now).lastInsertRowid
        );
    linkTodoTagStmt.run(todoId, tagId);
  }

  const todoRow = getTodoByIdStmt.get(todoId) as
    | Record<string, unknown>
    | undefined;
  if (!todoRow) {
    throw new Error("Failed to load created todo");
  }

  return {
    ...mapTodo(todoRow),
    subtasks: (
      listSubtasksStmt.all(todoId) as Array<Record<string, unknown>>
    ).map(mapSubtask),
    tags: (listTagsStmt.all(todoId) as Array<Record<string, unknown>>).map(
      mapTag
    )
  };
}

function clearAll(userId: number): void {
  clearTodosStmt.run(userId);
}

function getOrCreateTagId(
  userId: number,
  tag: { name: string; color: string },
  now: string,
  onReuse: () => void,
  onCreate: () => void
): number {
  const existing = findTagByNameCIStmt.get(userId, tag.name) as
    | { id: number }
    | undefined;

  if (existing) {
    onReuse();
    return existing.id;
  }

  onCreate();
  return Number(
    insertTagStmt.run(userId, tag.name, tag.color, now).lastInsertRowid
  );
}

function importAll(userId: number, items: TodoExportItem[]): ImportResult {
  let tagsCreated = 0;
  let tagsReused = 0;

  const transaction = db.transaction((payload: TodoExportItem[]) => {
    for (const item of payload) {
      const now = getSingaporeIsoTimestamp(getSingaporeNow());
      const todoId = Number(
        insertTodoStmt.run(
          userId,
          item.title,
          item.completed ? 1 : 0,
          item.due_date,
          item.priority,
          item.is_recurring ? 1 : 0,
          item.recurrence_pattern,
          item.reminder_minutes,
          null,
          item.created_at ?? now,
          now
        ).lastInsertRowid
      );

      const normalizedSubtasks = item.subtasks.map((subtask, index) => ({
        ...subtask,
        position: index
      }));

      for (const subtask of normalizedSubtasks) {
        insertSubtaskStmt.run(
          todoId,
          subtask.title,
          subtask.completed ? 1 : 0,
          subtask.position,
          now
        );
      }

      for (const tag of item.tags) {
        const tagId = getOrCreateTagId(
          userId,
          tag,
          now,
          () => {
            tagsReused += 1;
          },
          () => {
            tagsCreated += 1;
          }
        );

        linkTodoTagStmt.run(todoId, tagId);
      }
    }
  });

  transaction(items);
  return {
    imported: items.length,
    tagsCreated,
    tagsReused
  };
}

function findAllHolidays(): Holiday[] {
  return (listHolidaysStmt.all() as Array<Record<string, unknown>>).map(
    mapHoliday
  );
}

function findHolidaysByMonth(year: number, month: number): Holiday[] {
  const start = new Date(Date.UTC(year, month - 1, -6));
  const end = new Date(Date.UTC(year, month, 14));

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  return (
    listHolidaysByRangeStmt.all(startDate, endDate) as Array<
      Record<string, unknown>
    >
  ).map(mapHoliday);
}

function upsertHoliday(input: { date: string; name: string }): void {
  upsertHolidayStmt.run(
    input.date,
    input.name,
    getSingaporeIsoTimestamp(getSingaporeNow())
  );
}

export const todoDB = {
  createTodo,
  clearAll,
  findAllWithRelations: listWithRelations,
  importAll
};

export const userDB = {
  create: createUser,
  findById: findUserById,
  findByUsername: findUserByUsername
};

export const authenticatorDB = {
  create: createAuthenticator,
  findByCredentialId: findAuthenticatorByCredentialId,
  findByUserId: findAuthenticatorsByUserId,
  updateCounter: updateAuthenticatorCounter
};

export const holidayDB = {
  findAll: findAllHolidays,
  findByMonth: findHolidaysByMonth,
  upsert: upsertHoliday
};
