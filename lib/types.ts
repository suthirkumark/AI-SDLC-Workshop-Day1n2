// Shared types — safe to import in both Server and Client components.
// No Node.js runtime imports allowed here.

export type Priority = 'high' | 'medium' | 'low';

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoDto {
  title: string;
  priority?: Priority;
  due_date?: string | null;
}

export interface UpdateTodoDto {
  title?: string;
  completed?: boolean;
  priority?: Priority;
  due_date?: string | null;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface CreateSubtaskDto {
  title: string;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
}

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

export function calculateProgress(subtasks: Subtask[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
