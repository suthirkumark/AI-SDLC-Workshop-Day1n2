import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import type { User, Todo, CreateTodoDto, UpdateTodoDto, Subtask, CreateSubtaskDto, UpdateSubtaskDto, Tag, CreateTagInput, UpdateTagInput } from './types';
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
`);

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
    ...(row as Omit<Todo, 'completed'>),
    completed: row.completed === 1,
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
        'INSERT INTO todos (user_id, title, priority, due_date) VALUES (?, ?, ?, ?)'
      )
      .run(userId, data.title, data.priority ?? 'medium', data.due_date ?? null);
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: UpdateTodoDto): Todo {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
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

export default db;
