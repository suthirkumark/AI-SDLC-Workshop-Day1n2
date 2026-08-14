import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import type {
  User,
  Todo,
  CreateTodoDto,
  UpdateTodoDto,
  Subtask,
  CreateSubtaskDto,
  UpdateSubtaskDto,
  Tag,
  CreateTagInput,
  UpdateTagInput,
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  Holiday,
} from './types';
import { formatSingaporeDate } from './timezone';
export * from './types';

const db = new Database(path.join(process.cwd(), 'todos.db'));

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    title_template TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    due_date_offset_minutes INTEGER,
    subtasks_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
`);

// ─── Migrations ───────────────────────────────────────────────────────────────
// Columns added after the initial release. SQLite has no `ADD COLUMN IF NOT
// EXISTS`, so each is attempted and the "duplicate column name" error swallowed.

const TODO_MIGRATIONS = [
  `ALTER TABLE todos ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE todos ADD COLUMN recurrence_pattern TEXT`,
  `ALTER TABLE todos ADD COLUMN reminder_minutes INTEGER`,
  `ALTER TABLE todos ADD COLUMN last_notification_sent TEXT`,
];

for (const statement of TODO_MIGRATIONS) {
  try {
    db.exec(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('duplicate column name')) throw error;
  }
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);`);

/** Runs `fn` inside a single SQLite transaction, rolling back if it throws. */
export function runInTransaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

// ─── User DB ──────────────────────────────────────────────────────────────────

export const userDB = {
  findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  },

  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },

  create(username: string): User {
    const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
  },
};

// ─── Todo DB ──────────────────────────────────────────────────────────────────

function rowToTodo(row: Record<string, unknown>): Todo {
  return {
    ...(row as Omit<Todo, 'completed' | 'is_recurring'>),
    completed: row.completed === 1,
    is_recurring: row.is_recurring === 1,
  };
}

export const todoDB = {
  findAllByUser(userId: number): Todo[] {
    const rows = db
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(rowToTodo);
  },

  findById(id: number): Todo | undefined {
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToTodo(row) : undefined;
  },

  create(userId: number, data: CreateTodoDto): Todo {
    const result = db
      .prepare(
        `INSERT INTO todos
           (user_id, title, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        data.title,
        data.priority ?? 'medium',
        data.due_date ?? null,
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null
      );
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: UpdateTodoDto): Todo {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }
    if (data.is_recurring !== undefined) { fields.push('is_recurring = ?'); values.push(data.is_recurring ? 1 : 0); }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = ?'); values.push(data.recurrence_pattern); }
    if (data.reminder_minutes !== undefined) { fields.push('reminder_minutes = ?'); values.push(data.reminder_minutes); }
    if (data.last_notification_sent !== undefined) { fields.push('last_notification_sent = ?'); values.push(data.last_notification_sent); }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },

  /**
   * Incomplete todos with a reminder configured whose due date has not yet
   * passed by more than the reminder window. Narrowing to the exact
   * [due - reminder, due] window happens in the caller, where Singapore
   * wall-clock arithmetic lives.
   */
  findRemindable(userId: number): Todo[] {
    const rows = db
      .prepare(
        `SELECT * FROM todos
         WHERE user_id = ?
           AND completed = 0
           AND due_date IS NOT NULL
           AND reminder_minutes IS NOT NULL`
      )
      .all(userId) as Record<string, unknown>[];
    return rows.map(rowToTodo);
  },

  markNotificationSent(id: number, sentAt: string): void {
    db.prepare('UPDATE todos SET last_notification_sent = ? WHERE id = ?').run(sentAt, id);
  },
};

// ─── Subtask DB ───────────────────────────────────────────────────────────────

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    ...(row as Omit<Subtask, 'completed'>),
    completed: row.completed === 1,
  };
}

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    const rows = db
      .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC')
      .all(todoId) as Record<string, unknown>[];
    return rows.map(rowToSubtask);
  },

  findById(id: number): Subtask | undefined {
    const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToSubtask(row) : undefined;
  },

  create(todoId: number, data: CreateSubtaskDto): Subtask {
    const maxRow = db
      .prepare('SELECT COALESCE(MAX(position), -1) as maxPos FROM subtasks WHERE todo_id = ?')
      .get(todoId) as { maxPos: number };
    const position = maxRow.maxPos + 1;

    const result = db
      .prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)')
      .run(todoId, data.title, position);
    return this.findById(result.lastInsertRowid as number)!;
  },

  /** Insert at an explicit position — used by template expansion and import. */
  createAt(todoId: number, title: string, position: number): Subtask {
    const result = db
      .prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)')
      .run(todoId, title, position);
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: UpdateSubtaskDto): Subtask {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }

    values.push(id);
    db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },

  findTodoId(id: number): number | undefined {
    const row = db.prepare('SELECT todo_id FROM subtasks WHERE id = ?').get(id) as { todo_id: number } | undefined;
    return row?.todo_id;
  },
};

// ─── Tag DB ───────────────────────────────────────────────────────────────────

export const tagDB = {
  findAllByUser(userId: number): Tag[] {
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Tag[];
  },

  findById(id: number, userId: number): Tag | undefined {
    return db
      .prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(id, userId) as Tag | undefined;
  },

  /** Case-insensitive name lookup — import reuses an existing tag rather than duplicating it. */
  findByName(userId: number, name: string): Tag | undefined {
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? AND name = ? COLLATE NOCASE')
      .get(userId, name) as Tag | undefined;
  },

  findByTodoId(todoId: number): Tag[] {
    return db
      .prepare(
        `SELECT t.* FROM tags t
         JOIN todo_tags tt ON tt.tag_id = t.id
         WHERE tt.todo_id = ?
         ORDER BY t.name ASC`
      )
      .all(todoId) as Tag[];
  },

  create(userId: number, input: CreateTagInput): Tag {
    const result = db
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(userId, input.name, input.color ?? '#3B82F6');
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  },

  update(id: number, userId: number, input: UpdateTagInput): Tag | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.color !== undefined) { fields.push('color = ?'); values.push(input.color); }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    return this.findById(id, userId);
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
  },

  attachToTodo(todoId: number, tagId: number): void {
    db
      .prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)')
      .run(todoId, tagId);
  },

  detachFromTodo(todoId: number, tagId: number): void {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },
};

// ─── Template DB ──────────────────────────────────────────────────────────────

function rowToTemplate(row: Record<string, unknown>): Template {
  return {
    ...(row as Omit<Template, 'is_recurring'>),
    is_recurring: row.is_recurring === 1,
  };
}

export const templateDB = {
  findAllByUser(userId: number): Template[] {
    const rows = db
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY category ASC, name ASC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(rowToTemplate);
  },

  findById(id: number, userId: number): Template | undefined {
    const row = db
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    return row ? rowToTemplate(row) : undefined;
  },

  create(userId: number, data: CreateTemplateDto): Template {
    const result = db
      .prepare(
        `INSERT INTO templates
           (user_id, name, description, category, title_template, priority,
            is_recurring, recurrence_pattern, reminder_minutes,
            due_date_offset_minutes, subtasks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        data.name,
        data.description ?? null,
        data.category ?? null,
        data.title_template,
        data.priority ?? 'medium',
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null,
        data.due_date_offset_minutes ?? null,
        data.subtasks && data.subtasks.length > 0 ? JSON.stringify(data.subtasks) : null
      );
    return this.findById(result.lastInsertRowid as number, userId)!;
  },

  update(id: number, userId: number, data: UpdateTemplateDto): Template | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.title_template !== undefined) { fields.push('title_template = ?'); values.push(data.title_template); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.is_recurring !== undefined) { fields.push('is_recurring = ?'); values.push(data.is_recurring ? 1 : 0); }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = ?'); values.push(data.recurrence_pattern); }
    if (data.reminder_minutes !== undefined) { fields.push('reminder_minutes = ?'); values.push(data.reminder_minutes); }
    if (data.due_date_offset_minutes !== undefined) { fields.push('due_date_offset_minutes = ?'); values.push(data.due_date_offset_minutes); }
    if (data.subtasks !== undefined) {
      fields.push('subtasks_json = ?');
      values.push(data.subtasks && data.subtasks.length > 0 ? JSON.stringify(data.subtasks) : null);
    }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    return this.findById(id, userId);
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
  },
};

// ─── Holiday DB ───────────────────────────────────────────────────────────────

export const holidayDB = {
  findAll(): Holiday[] {
    return db.prepare('SELECT id, date, name FROM holidays ORDER BY date ASC').all() as Holiday[];
  },

  /** Holidays within an inclusive 'YYYY-MM-DD' range. */
  findBetween(from: string, to: string): Holiday[] {
    return db
      .prepare('SELECT id, date, name FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date ASC')
      .all(from, to) as Holiday[];
  },

  /**
   * Holidays for a calendar month, where `month` is 1-12. The range is padded
   * by a week either side so holidays landing on the grid's leading and
   * trailing adjacent-month cells are included.
   */
  findByMonth(year: number, month: number): Holiday[] {
    // UTC-based arithmetic so the padding window is not skewed by the server's
    // own timezone — see the note at the top of lib/timezone.ts.
    const from = new Date(Date.UTC(year, month - 1, 1 - 7));
    const to = new Date(Date.UTC(year, month, 7));
    return this.findBetween(formatSingaporeDate(from), formatSingaporeDate(to));
  },

  upsert(date: string, name: string): void {
    db
      .prepare(
        `INSERT INTO holidays (date, name) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET name = excluded.name`
      )
      .run(date, name);
  },
};

export default db;
