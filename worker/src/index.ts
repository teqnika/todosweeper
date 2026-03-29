import { Hono } from "hono";
import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

// ── 型定義 ────────────────────────────────────────────────
type Bindings = {
  ASANA_TOKEN: string;
  ASANA_PROJECT_ID: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ALLOWED_EMAIL: string;   // カンマ区切りの許可メールアドレス
  FRONTEND_URL: string;    // e.g. http://localhost:5173
};

type Variables = {
  user: { email: string; name: string; picture: string; exp: number };
};

type AsanaTask = {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  due_on: string | null;
  custom_fields: { gid: string; number_value: number | null }[];
};

// ── JWT ──────────────────────────────────────────────────

function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(s: string): string {
  const r = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = r.length % 4;
  const padded = pad ? r + "=".repeat(4 - pad) : r;
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function signJwt(payload: object, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigBinary = String.fromCharCode(...new Uint8Array(sig));
  return `${data}.${btoa(sigBinary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;
}

async function verifyJwt(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const r = sig.replace(/-/g, "+").replace(/_/g, "/");
  const pad = r.length % 4;
  const sigBytes = Uint8Array.from(atob(pad ? r + "=".repeat(4 - pad) : r), (c) =>
    c.charCodeAt(0)
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(`${header}.${body}`)
  );
  if (!valid) return null;
  const payload = JSON.parse(b64urlDecode(body)) as Record<string, unknown>;
  if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) return null;
  return payload;
}

// ── 認証ミドルウェア ──────────────────────────────────────

const authMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (
  c,
  next
) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const payload = await verifyJwt(auth.slice(7), c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", payload as Variables["user"]);
  await next();
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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ── 認証ルート ────────────────────────────────────────────

// Google OAuth 開始
app.get("/auth/google", (c) => {
  const callbackUrl = `${new URL(c.req.url).origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Google OAuth コールバック
app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");
  const callbackUrl = `${new URL(c.req.url).origin}/auth/callback`;

  if (error || !code) {
    return c.redirect(`${c.env.FRONTEND_URL}?auth_error=cancelled`);
  }

  // 認可コード → アクセストークン交換
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return c.redirect(`${c.env.FRONTEND_URL}?auth_error=token_exchange`);
  }

  const { id_token } = await tokenRes.json<{ id_token: string }>();

  // Google の ID トークンからユーザー情報を取得
  const [, payloadB64] = id_token.split(".");
  const claims = JSON.parse(b64urlDecode(payloadB64)) as {
    email: string;
    name: string;
    picture: string;
    email_verified: boolean;
  };

  if (!claims.email_verified) {
    return c.redirect(`${c.env.FRONTEND_URL}?auth_error=unverified`);
  }

  // 許可リストチェック
  const allowed = c.env.ALLOWED_EMAIL.split(",").map((e) => e.trim().toLowerCase());
  if (!allowed.includes(claims.email.toLowerCase())) {
    return c.redirect(`${c.env.FRONTEND_URL}?auth_error=unauthorized`);
  }

  // JWT 発行（有効期限 7 日）
  const jwt = await signJwt(
    {
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
    c.env.JWT_SECRET
  );

  return c.redirect(`${c.env.FRONTEND_URL}?token=${jwt}`);
});

// ログイン中ユーザー情報
app.get("/auth/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ user: null });
  const payload = await verifyJwt(auth.slice(7), c.env.JWT_SECRET);
  return c.json({ user: payload ?? null });
});

// ── API ルート（要認証）──────────────────────────────────

app.use("/api/*", authMiddleware);

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
