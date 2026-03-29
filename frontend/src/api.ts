// src/api.ts
// Workers 経由で Asana を操作する API クライアント

const BASE = import.meta.env.VITE_API_URL ?? "";

export type Todo = {
  id: string;         // Asana task gid
  title: string;
  memo: string;
  completed: boolean;
  dueDate: string | null;
  priority: number;
  snoozedUntil: string | null;
};

export type User = {
  email: string;
  name: string;
  picture: string;
};

// ── 認証トークン管理 ──────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function saveToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("auth_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── fetch ラッパー ────────────────────────────────────────

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── 認証 API ─────────────────────────────────────────────

export async function fetchMe(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    const data = await req<{ user: User | null }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

// ── タスク API ────────────────────────────────────────────

export const fetchTodos = (): Promise<Todo[]> =>
  req("/api/todos");

export const createTodo = (data: {
  title: string;
  memo?: string;
  dueDate?: string | null;
  priority?: number;
}): Promise<Todo> =>
  req("/api/todos", { method: "POST", body: JSON.stringify(data) });

export const bulkCreateTodos = (titles: string[]): Promise<Todo[]> =>
  req("/api/todos/bulk", { method: "POST", body: JSON.stringify({ titles }) });

export const updateTodo = (
  id: string,
  data: Partial<Pick<Todo, "memo" | "dueDate" | "priority" | "snoozedUntil">>
): Promise<Todo> =>
  req(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const completeTodo = (id: string, completed: boolean): Promise<Todo> =>
  req(`/api/todos/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });

export const deleteTodo = (id: string): Promise<{ ok: boolean }> =>
  req(`/api/todos/${id}`, { method: "DELETE" });
