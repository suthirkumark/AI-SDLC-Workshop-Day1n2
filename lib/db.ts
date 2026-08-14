/**
 * lib/db.ts
 * Single source of truth for the SQLite database connection, schema, types,
 * and all CRUD helpers (todoDB, subtaskDB, tagDB, templateDB, userDB,
 * authenticatorDB, holidayDB, notificationDB).
 *
 * Uses better-sqlite3 (synchronous) — no async/await for DB operations.
 */

import Database from 'better-sqlite3';
import path from 'path';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const DB_PATH = path.join(process.cwd(), 'todos.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

function initSchema(db: Database.Database): void {
  db.exec(`
    -- Users & auth
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS authenticators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT UNIQUE NOT NULL,
      credential_public_key BLOB NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);

    -- Todos
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      last_notification_sent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

    -- Subtasks
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

    -- Tags
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

    -- Templates
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

    -- Holidays
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(date)
    );

    -- WebAuthn challenge store (short-lived)
    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      username TEXT PRIMARY KEY,
      challenge TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

// ---------------------------------------------------------------------------
// User & Authenticator types
// ---------------------------------------------------------------------------

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

export interface Session {
  userId: number;
  username: string;
}

// ---------------------------------------------------------------------------
// Todo types
// ---------------------------------------------------------------------------

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
  updated_at: string | null;
  subtasks?: Subtask[];
  tags?: Tag[];
}

export interface CreateTodoInput {
  user_id: number;
  title: string;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  tag_ids?: number[];
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  tag_ids?: number[];
  last_notification_sent?: string | null;
}

// ---------------------------------------------------------------------------
// Subtask types
// ---------------------------------------------------------------------------

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface CreateSubtaskDto {
  todo_id: number;
  title: string;
  position?: number;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
}

// ---------------------------------------------------------------------------
// Tag types
// ---------------------------------------------------------------------------

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Template types
// ---------------------------------------------------------------------------

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface TemplateSubtask {
  title: string;
  position: number;
}

export interface CreateTemplateDto {
  user_id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  title_template: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  due_date_offset_minutes?: number | null;
  subtasks_json?: string | null;
}

// ---------------------------------------------------------------------------
// Helper: row mapper for booleans and timestamps
// ---------------------------------------------------------------------------

function mapTodo(row: Record<string, unknown>): Todo {
  return {
    ...(row as unknown as Todo),
    completed: row.completed === 1,
    is_recurring: row.is_recurring === 1,
  };
}

function mapSubtask(row: Record<string, unknown>): Subtask {
  return {
    ...(row as unknown as Subtask),
    completed: row.completed === 1,
  };
}

function mapTemplate(row: Record<string, unknown>): Template {
  return {
    ...(row as unknown as Template),
    is_recurring: row.is_recurring === 1,
  };
}

// ---------------------------------------------------------------------------
// userDB
// ---------------------------------------------------------------------------

export const userDB = {
  findById(id: number): User | null {
    const db = getDb();
    return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User) ?? null;
  },
  findByUsername(username: string): User | null {
    const db = getDb();
    return (
      (db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User) ?? null
    );
  },
  create(username: string): User {
    const db = getDb();
    const info = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return userDB.findById(info.lastInsertRowid as number)!;
  },
};

// ---------------------------------------------------------------------------
// authenticatorDB
// ---------------------------------------------------------------------------

export const authenticatorDB = {
  findByUserId(userId: number): Authenticator[] {
    const db = getDb();
    return db.prepare('SELECT * FROM authenticators WHERE user_id = ?').all(userId) as Authenticator[];
  },
  findByCredentialId(credentialId: string): Authenticator | null {
    const db = getDb();
    return (
      (db
        .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
        .get(credentialId) as Authenticator) ?? null
    );
  },
  create(data: {
    user_id: number;
    credential_id: string;
    credential_public_key: Buffer;
    counter: number;
  }): Authenticator {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter)
         VALUES (@user_id, @credential_id, @credential_public_key, @counter)`
      )
      .run(data);
    return db
      .prepare('SELECT * FROM authenticators WHERE id = ?')
      .get(info.lastInsertRowid as number) as Authenticator;
  },
  updateCounter(id: number, counter: number): void {
    const db = getDb();
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

// ---------------------------------------------------------------------------
// challengeStore (WebAuthn challenges, keyed by username)
// ---------------------------------------------------------------------------

export const challengeStore = {
  save(username: string, challenge: string): void {
    const db = getDb();
    db
      .prepare(
        `INSERT INTO webauthn_challenges (username, challenge) VALUES (?, ?)
         ON CONFLICT(username) DO UPDATE SET challenge = excluded.challenge,
         created_at = strftime('%s', 'now')`
      )
      .run(username, challenge);
  },
  get(username: string): string | null {
    const db = getDb();
    const row = db
      .prepare('SELECT challenge FROM webauthn_challenges WHERE username = ?')
      .get(username) as { challenge: string } | undefined;
    return row?.challenge ?? null;
  },
  delete(username: string): void {
    const db = getDb();
    db.prepare('DELETE FROM webauthn_challenges WHERE username = ?').run(username);
  },
};

// ---------------------------------------------------------------------------
// todoDB
// ---------------------------------------------------------------------------

export const todoDB = {
  findAllByUser(userId: number): Todo[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
         FROM todos t
         LEFT JOIN todo_tags tt ON tt.todo_id = t.id
         WHERE t.user_id = ?
         GROUP BY t.id
         ORDER BY t.created_at DESC`
      )
      .all(userId) as Record<string, unknown>[];

    return rows.map((row) => {
      const todo = mapTodo(row);
      const tagIds = row.tag_ids
        ? String(row.tag_ids)
            .split(',')
            .map(Number)
            .filter(Boolean)
        : [];
      todo.tags = tagIds.length
        ? (db
            .prepare(`SELECT * FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})`)
            .all(...tagIds) as Tag[])
        : [];
      todo.subtasks = subtaskDB.findAllByTodo(todo.id);
      return todo;
    });
  },

  findById(id: number): Todo | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    const todo = mapTodo(row);
    todo.subtasks = subtaskDB.findAllByTodo(todo.id);
    todo.tags = tagDB.findByTodoId(todo.id);
    return todo;
  },

  create(data: CreateTodoInput): Todo {
    const db = getDb();
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO todos
           (user_id, title, due_date, priority, is_recurring, recurrence_pattern,
            reminder_minutes, created_at, updated_at)
         VALUES
           (@user_id, @title, @due_date, @priority, @is_recurring,
            @recurrence_pattern, @reminder_minutes, @created_at, @updated_at)`
      )
      .run({
        user_id: data.user_id,
        title: data.title,
        due_date: data.due_date ?? null,
        priority: data.priority ?? 'medium',
        is_recurring: data.is_recurring ? 1 : 0,
        recurrence_pattern: data.recurrence_pattern ?? null,
        reminder_minutes: data.reminder_minutes ?? null,
        created_at: now,
        updated_at: now,
      });

    const id = info.lastInsertRowid as number;

    if (data.tag_ids?.length) {
      const insertTag = db.prepare(
        'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
      );
      for (const tagId of data.tag_ids) {
        insertTag.run(id, tagId);
      }
    }

    return todoDB.findById(id)!;
  },

  update(id: number, data: UpdateTodoInput): Todo {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    if (!existing) throw new Error(`Todo ${id} not found`);

    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    if (data.title !== undefined) { fields.push('title = @title'); values.title = data.title; }
    if (data.completed !== undefined) { fields.push('completed = @completed'); values.completed = data.completed ? 1 : 0; }
    if (data.due_date !== undefined) { fields.push('due_date = @due_date'); values.due_date = data.due_date; }
    if (data.priority !== undefined) { fields.push('priority = @priority'); values.priority = data.priority; }
    if (data.is_recurring !== undefined) { fields.push('is_recurring = @is_recurring'); values.is_recurring = data.is_recurring ? 1 : 0; }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = @recurrence_pattern'); values.recurrence_pattern = data.recurrence_pattern; }
    if (data.reminder_minutes !== undefined) { fields.push('reminder_minutes = @reminder_minutes'); values.reminder_minutes = data.reminder_minutes; }
    if (data.last_notification_sent !== undefined) { fields.push('last_notification_sent = @last_notification_sent'); values.last_notification_sent = data.last_notification_sent; }

    fields.push('updated_at = @updated_at');
    values.updated_at = new Date().toISOString();

    if (fields.length > 1) {
      db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }

    if (data.tag_ids !== undefined) {
      db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(id);
      if (data.tag_ids.length) {
        const insertTag = db.prepare(
          'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
        );
        for (const tagId of data.tag_ids) {
          insertTag.run(id, tagId);
        }
      }
    }

    return todoDB.findById(id)!;
  },

  delete(id: number): void {
    const db = getDb();
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },
};

// ---------------------------------------------------------------------------
// subtaskDB
// ---------------------------------------------------------------------------

export const subtaskDB = {
  findAllByTodo(todoId: number): Subtask[] {
    const db = getDb();
    return (
      db
        .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC, id ASC')
        .all(todoId) as Record<string, unknown>[]
    ).map(mapSubtask);
  },

  create(data: CreateSubtaskDto): Subtask {
    const db = getDb();
    let position = data.position;
    if (position === undefined) {
      const row = db
        .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM subtasks WHERE todo_id = ?')
        .get(data.todo_id) as { next: number };
      position = row.next;
    }
    const info = db
      .prepare(
        'INSERT INTO subtasks (todo_id, title, position) VALUES (@todo_id, @title, @position)'
      )
      .run({ todo_id: data.todo_id, title: data.title, position });
    return mapSubtask(
      db.prepare('SELECT * FROM subtasks WHERE id = ?').get(info.lastInsertRowid as number) as Record<string, unknown>
    );
  },

  update(id: number, data: UpdateSubtaskDto): Subtask {
    const db = getDb();
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    if (data.title !== undefined) { fields.push('title = @title'); values.title = data.title; }
    if (data.completed !== undefined) { fields.push('completed = @completed'); values.completed = data.completed ? 1 : 0; }

    if (fields.length) {
      db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }

    return mapSubtask(
      db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown>
    );
  },

  delete(id: number): void {
    const db = getDb();
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },
};

// ---------------------------------------------------------------------------
// tagDB
// ---------------------------------------------------------------------------

export const tagDB = {
  findAllByUser(userId: number): Tag[] {
    const db = getDb();
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Tag[];
  },

  findById(id: number): Tag | null {
    const db = getDb();
    return (db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag) ?? null;
  },

  findByTodoId(todoId: number): Tag[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT tags.* FROM tags
         INNER JOIN todo_tags ON todo_tags.tag_id = tags.id
         WHERE todo_tags.todo_id = ?`
      )
      .all(todoId) as Tag[];
  },

  create(userId: number, input: CreateTagInput): Tag {
    const db = getDb();
    const info = db
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(userId, input.name, input.color ?? '#3B82F6');
    return tagDB.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, userId: number, input: UpdateTagInput): Tag | null {
    const db = getDb();
    const fields: string[] = [];
    const values: Record<string, unknown> = { id, userId };

    if (input.name !== undefined) { fields.push('name = @name'); values.name = input.name; }
    if (input.color !== undefined) { fields.push('color = @color'); values.color = input.color; }

    if (!fields.length) return tagDB.findById(id);

    db.prepare(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = @id AND user_id = @userId`
    ).run(values);
    return tagDB.findById(id);
  },

  delete(id: number, userId: number): void {
    const db = getDb();
    db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
  },

  attachToTodo(todoId: number, tagId: number): void {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
  },

  detachFromTodo(todoId: number, tagId: number): void {
    const db = getDb();
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },
};

// ---------------------------------------------------------------------------
// templateDB
// ---------------------------------------------------------------------------

export const templateDB = {
  findAllByUser(userId: number): Template[] {
    const db = getDb();
    return (
      db
        .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId) as Record<string, unknown>[]
    ).map(mapTemplate);
  },

  findById(id: number): Template | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? mapTemplate(row) : null;
  },

  create(data: CreateTemplateDto): Template {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO templates
           (user_id, name, description, category, title_template, priority,
            is_recurring, recurrence_pattern, reminder_minutes,
            due_date_offset_minutes, subtasks_json)
         VALUES
           (@user_id, @name, @description, @category, @title_template,
            @priority, @is_recurring, @recurrence_pattern, @reminder_minutes,
            @due_date_offset_minutes, @subtasks_json)`
      )
      .run({
        user_id: data.user_id,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        title_template: data.title_template,
        priority: data.priority ?? 'medium',
        is_recurring: data.is_recurring ? 1 : 0,
        recurrence_pattern: data.recurrence_pattern ?? null,
        reminder_minutes: data.reminder_minutes ?? null,
        due_date_offset_minutes: data.due_date_offset_minutes ?? null,
        subtasks_json: data.subtasks_json ?? null,
      });
    return templateDB.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, userId: number, data: Partial<CreateTemplateDto>): Template | null {
    const db = getDb();
    const existing = templateDB.findById(id);
    if (!existing || existing.user_id !== userId) return null;

    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    const fieldMap: Array<[keyof Partial<CreateTemplateDto>, string]> = [
      ['name', 'name'],
      ['description', 'description'],
      ['category', 'category'],
      ['title_template', 'title_template'],
      ['priority', 'priority'],
      ['recurrence_pattern', 'recurrence_pattern'],
      ['reminder_minutes', 'reminder_minutes'],
      ['due_date_offset_minutes', 'due_date_offset_minutes'],
      ['subtasks_json', 'subtasks_json'],
    ];
    for (const [key, col] of fieldMap) {
      if (data[key] !== undefined) {
        fields.push(`${col} = @${col}`);
        values[col] = data[key] as unknown;
      }
    }
    if (data.is_recurring !== undefined) {
      fields.push('is_recurring = @is_recurring');
      values.is_recurring = data.is_recurring ? 1 : 0;
    }

    if (fields.length) {
      db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }
    return templateDB.findById(id);
  },

  delete(id: number, userId: number): void {
    const db = getDb();
    db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
  },
};

// ---------------------------------------------------------------------------
// holidayDB
// ---------------------------------------------------------------------------

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export const holidayDB = {
  findAll(): Holiday[] {
    const db = getDb();
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[];
  },

  findByMonth(year: number, month: number): Holiday[] {
    const db = getDb();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return db
      .prepare("SELECT * FROM holidays WHERE date LIKE ? ORDER BY date ASC")
      .all(`${prefix}%`) as Holiday[];
  },

  upsert(date: string, name: string): void {
    const db = getDb();
    db
      .prepare(
        "INSERT INTO holidays (date, name) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET name = excluded.name"
      )
      .run(date, name);
  },
};
