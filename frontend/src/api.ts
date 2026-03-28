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

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// タスク一覧取得
export const fetchTodos = (): Promise<Todo[]> =>
  req("/api/todos");

// タスク作成
export const createTodo = (data: {
  title: string;
  memo?: string;
  dueDate?: string | null;
  priority?: number;
}): Promise<Todo> =>
  req("/api/todos", { method: "POST", body: JSON.stringify(data) });

// 一括タスク作成
export const bulkCreateTodos = (titles: string[]): Promise<Todo[]> =>
  req("/api/todos/bulk", { method: "POST", body: JSON.stringify({ titles }) });

// タスク更新（メモ・期限・優先度・スヌーズ）
export const updateTodo = (
  id: string,
  data: Partial<Pick<Todo, "memo" | "dueDate" | "priority" | "snoozedUntil">>
): Promise<Todo> =>
  req(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// 完了・未完了切り替え
export const completeTodo = (id: string, completed: boolean): Promise<Todo> =>
  req(`/api/todos/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });

// タスク削除（ゴミ箱へ = Asana 上は delete）
export const deleteTodo = (id: string): Promise<{ ok: boolean }> =>
  req(`/api/todos/${id}`, { method: "DELETE" });
