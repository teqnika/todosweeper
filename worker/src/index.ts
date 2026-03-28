import { Hono } from "hono";
import { cors } from "hono/cors";

// ── 型定義 ────────────────────────────────────────────────
type Bindings = {
  ASANA_TOKEN: string;
  ASANA_PROJECT_ID: string; // 1202804017257914
};

type AsanaTask = {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  due_on: string | null;
  custom_fields: { gid: string; number_value: number | null }[];
};

// ── Asana API ヘルパー ────────────────────────────────────
function asanaFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`https://app.asana.com/api/1.0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// Asana タスク → アプリ形式に変換
function toTodo(task: AsanaTask) {
  const notes = task.notes ?? "";

  // notes の1行目をメモ、残りをメタデータとして扱う
  // フォーマット: メモ本文\n---\npriority:N\nsnoozedUntil:YYYY-MM-DD
  const [memoRaw, metaRaw] = notes.split("\n---\n");
  const meta: Record<string, string> = {};
  (metaRaw ?? "").split("\n").forEach((line) => {
    const [k, v] = line.split(":");
    if (k && v) meta[k.trim()] = v.trim();
  });

  return {
    id: task.gid,
    title: task.name,
    memo: memoRaw ?? "",
    completed: task.completed,
    dueDate: task.due_on ?? null,
    priority: Number(meta["priority"] ?? 0),
    snoozedUntil: meta["snoozedUntil"] ?? null,
  };
}

// メモ + メタデータ → Asana notes 文字列に変換
function toNotes(memo: string, priority: number, snoozedUntil: string | null) {
  const meta = [`priority:${priority}`, snoozedUntil ? `snoozedUntil:${snoozedUntil}` : ""]
    .filter(Boolean)
    .join("\n");
  return meta ? `${memo}\n---\n${meta}` : memo;
}

// ── Hono アプリ ───────────────────────────────────────────
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// GET /api/todos — タスク一覧取得
app.get("/api/todos", async (c) => {
  const projectId = c.env.ASANA_PROJECT_ID;
  const res = await asanaFetch(
    c.env.ASANA_TOKEN,
    `/projects/${projectId}/tasks?opt_fields=gid,name,notes,completed,due_on&limit=100`
  );
  const json = await res.json<{ data: AsanaTask[] }>();
  return c.json(json.data.map(toTodo));
});

// POST /api/todos — タスク作成
app.post("/api/todos", async (c) => {
  const { title, memo = "", dueDate = null, priority = 0 } = await c.req.json();
  const res = await asanaFetch(c.env.ASANA_TOKEN, "/tasks", {
    method: "POST",
    body: JSON.stringify({
      data: {
        name: title,
        notes: toNotes(memo, priority, null),
        due_on: dueDate,
        projects: [c.env.ASANA_PROJECT_ID],
      },
    }),
  });
  const json = await res.json<{ data: AsanaTask }>();
  return c.json(toTodo(json.data), 201);
});

// POST /api/todos/bulk — 一括タスク作成
app.post("/api/todos/bulk", async (c) => {
  const { titles } = await c.req.json<{ titles: string[] }>();
  const results = await Promise.all(
    titles.map((title) =>
      asanaFetch(c.env.ASANA_TOKEN, "/tasks", {
        method: "POST",
        body: JSON.stringify({
          data: {
            name: title,
            notes: toNotes("", 0, null),
            projects: [c.env.ASANA_PROJECT_ID],
          },
        }),
      }).then((r) => r.json<{ data: AsanaTask }>().then((j) => toTodo(j.data)))
    )
  );
  return c.json(results, 201);
});

// PATCH /api/todos/:id — タスク更新（メモ・期限・優先度・スヌーズ）
app.patch("/api/todos/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    memo?: string;
    dueDate?: string | null;
    priority?: number;
    snoozedUntil?: string | null;
  }>();

  // 現在の notes を取得してマージ
  const current = await asanaFetch(
    c.env.ASANA_TOKEN,
    `/tasks/${id}?opt_fields=gid,name,notes,completed,due_on`
  ).then((r) => r.json<{ data: AsanaTask }>());

  const existing = toTodo(current.data);
  const memo = body.memo ?? existing.memo;
  const priority = body.priority ?? existing.priority;
  const snoozedUntil = "snoozedUntil" in body ? body.snoozedUntil : existing.snoozedUntil;
  const dueDate = "dueDate" in body ? body.dueDate : existing.dueDate;

  const res = await asanaFetch(c.env.ASANA_TOKEN, `/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      data: {
        notes: toNotes(memo, priority, snoozedUntil ?? null),
        due_on: dueDate ?? null,
      },
    }),
  });
  const json = await res.json<{ data: AsanaTask }>();
  return c.json(toTodo(json.data));
});

// PATCH /api/todos/:id/complete — 完了・未完了切り替え
app.patch("/api/todos/:id/complete", async (c) => {
  const id = c.req.param("id");
  const { completed } = await c.req.json<{ completed: boolean }>();
  const res = await asanaFetch(c.env.ASANA_TOKEN, `/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify({ data: { completed } }),
  });
  const json = await res.json<{ data: AsanaTask }>();
  return c.json(toTodo(json.data));
});

// DELETE /api/todos/:id — タスク削除
app.delete("/api/todos/:id", async (c) => {
  const id = c.req.param("id");
  await asanaFetch(c.env.ASANA_TOKEN, `/tasks/${id}`, { method: "DELETE" });
  return c.json({ ok: true });
});

export default app;
