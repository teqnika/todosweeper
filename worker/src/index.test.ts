import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import app from "./index";

const TEST_JWT_SECRET = "test-secret-for-unit-tests";

const ENV = {
  ASANA_TOKEN: "fake-token",
  ASANA_PROJECT_ID: "fake-project-id",
  GOOGLE_CLIENT_ID: "fake-client-id",
  GOOGLE_CLIENT_SECRET: "fake-client-secret",
  JWT_SECRET: TEST_JWT_SECRET,
  ALLOWED_EMAIL: "test@example.com",
  FRONTEND_URL: "http://localhost:5173",
};

// ── ヘルパー ──────────────────────────────────────────────

/** テスト用 JWT トークンを Node crypto で生成（Web Crypto と HMAC-SHA256 互換）*/
function createTestToken(secret = TEST_JWT_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ email: "test@example.com", name: "Test", picture: "", exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function asanaTask(overrides: Record<string, unknown> = {}) {
  return {
    gid: "123",
    name: "テストタスク",
    notes: "",
    completed: false,
    due_on: null,
    custom_fields: [],
    ...overrides,
  };
}

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

/** 認証ヘッダー付きリクエスト */
function req(path: string, init?: RequestInit) {
  const token = createTestToken();
  return app.request(
    path,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers as Record<string, string> ?? {}),
      },
    },
    ENV
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch({ data: [] }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ── toTodo / toNotes シリアライズ（GET 経由で検証） ───────
describe("toTodo: notes のデシリアライズ", () => {
  it("メタデータなし: memo をそのまま返し priority=0, snoozedUntil=null", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ notes: "プレーンなメモ" })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo).toMatchObject({ memo: "プレーンなメモ", priority: 0, snoozedUntil: null });
  });

  it("priority と snoozedUntil を正しくパース", async () => {
    const notes = "My memo\n---\npriority:3\nsnoozedUntil:2026-04-01";
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ notes })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo).toMatchObject({ memo: "My memo", priority: 3, snoozedUntil: "2026-04-01" });
  });

  it("priority のみのメタデータをパース", async () => {
    const notes = "メモ\n---\npriority:5";
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ notes })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo).toMatchObject({ memo: "メモ", priority: 5, snoozedUntil: null });
  });

  it("空の notes でデフォルト値を返す", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ notes: "" })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo).toMatchObject({ memo: "", priority: 0, snoozedUntil: null });
  });

  it("gid を id にマップする", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ gid: "abc123" })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo.id).toBe("abc123");
  });

  it("due_on を dueDate にマップする", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ due_on: "2026-04-10" })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo.dueDate).toBe("2026-04-10");
  });

  it("due_on が null のとき dueDate は null", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask({ due_on: null })] }));
    const res = await req("/api/todos");
    const [todo] = await res.json();
    expect(todo.dueDate).toBeNull();
  });
});

// ── GET /api/todos ────────────────────────────────────────
describe("GET /api/todos", () => {
  it("200 とタスク配列を返す", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [asanaTask(), asanaTask({ gid: "456" })] }));
    const res = await req("/api/todos");
    expect(res.status).toBe(200);
    const todos = await res.json();
    expect(todos).toHaveLength(2);
  });

  it("タスクがゼロでも空配列を返す", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [] }));
    const res = await req("/api/todos");
    const todos = await res.json();
    expect(todos).toEqual([]);
  });

  it("認証ヘッダーなしは 401 を返す", async () => {
    const res = await app.request("/api/todos", {}, ENV);
    expect(res.status).toBe(401);
  });

  it("無効なトークンは 401 を返す", async () => {
    const res = await app.request(
      "/api/todos",
      { headers: { Authorization: "Bearer invalid.token.here" } },
      ENV
    );
    expect(res.status).toBe(401);
  });
});

// ── POST /api/todos ───────────────────────────────────────
describe("POST /api/todos", () => {
  it("201 と作成されたタスクを返す", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: asanaTask({ name: "新タスク" }) }));
    const res = await req("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "新タスク", memo: "メモ" }),
    });
    expect(res.status).toBe(201);
    const todo = await res.json();
    expect(todo.title).toBe("新タスク");
  });

  it("priority と memo を notes にシリアライズして Asana に送る", async () => {
    let capturedNotes = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        const body = JSON.parse(opts.body as string);
        capturedNotes = body.data.notes;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: asanaTask({ notes: capturedNotes }) }),
        });
      })
    );
    await req("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "T", memo: "メモ本文", priority: 2 }),
    });
    expect(capturedNotes).toContain("メモ本文");
    expect(capturedNotes).toContain("priority:2");
  });

  it("priority を省略したとき priority:0 を notes に含む", async () => {
    let capturedNotes = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        const body = JSON.parse(opts.body as string);
        capturedNotes = body.data.notes;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: asanaTask() }),
        });
      })
    );
    await req("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "T" }),
    });
    expect(capturedNotes).toContain("priority:0");
  });
});

// ── POST /api/todos/bulk ──────────────────────────────────
describe("POST /api/todos/bulk", () => {
  it("201 と作成されたタスク配列を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: asanaTask({ gid: "1" }) }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: asanaTask({ gid: "2" }) }) })
    );
    const res = await req("/api/todos/bulk", {
      method: "POST",
      body: JSON.stringify({ titles: ["タスクA", "タスクB"] }),
    });
    expect(res.status).toBe(201);
    const todos = await res.json();
    expect(todos).toHaveLength(2);
  });
});

// ── PATCH /api/todos/:id ──────────────────────────────────
describe("PATCH /api/todos/:id", () => {
  it("まず現在のタスクを取得してから PUT する（2回 fetch）", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: asanaTask({ notes: "旧メモ\n---\npriority:1" }) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: asanaTask({ notes: "新メモ\n---\npriority:1" }) }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = await req("/api/todos/123", {
      method: "PATCH",
      body: JSON.stringify({ memo: "新メモ" }),
    });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("既存の priority を保持して memo だけ更新する", async () => {
    let capturedNotes = "";
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: asanaTask({ notes: "旧メモ\n---\npriority:3" }) }),
        })
        .mockImplementationOnce((_url: string, opts: RequestInit) => {
          const body = JSON.parse(opts.body as string);
          capturedNotes = body.data.notes;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: asanaTask({ notes: capturedNotes }) }),
          });
        })
    );
    await req("/api/todos/123", {
      method: "PATCH",
      body: JSON.stringify({ memo: "新メモ" }),
    });
    expect(capturedNotes).toContain("新メモ");
    expect(capturedNotes).toContain("priority:3");
  });

  it("snoozedUntil を明示的に null でクリアできる", async () => {
    let capturedNotes = "";
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: asanaTask({ notes: "メモ\n---\npriority:0\nsnoozedUntil:2026-04-01" }),
            }),
        })
        .mockImplementationOnce((_url: string, opts: RequestInit) => {
          const body = JSON.parse(opts.body as string);
          capturedNotes = body.data.notes;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: asanaTask({ notes: capturedNotes }) }),
          });
        })
    );
    await req("/api/todos/123", {
      method: "PATCH",
      body: JSON.stringify({ snoozedUntil: null }),
    });
    expect(capturedNotes).not.toContain("snoozedUntil");
  });
});

// ── PATCH /api/todos/:id/complete ────────────────────────
describe("PATCH /api/todos/:id/complete", () => {
  it("completed:true でタスクを完了にする", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: asanaTask({ completed: true }) }));
    const res = await req("/api/todos/123/complete", {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    });
    expect(res.status).toBe(200);
    const todo = await res.json();
    expect(todo.completed).toBe(true);
  });

  it("completed:false でタスクを未完了に戻す", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: asanaTask({ completed: false }) }));
    const res = await req("/api/todos/123/complete", {
      method: "PATCH",
      body: JSON.stringify({ completed: false }),
    });
    const todo = await res.json();
    expect(todo.completed).toBe(false);
  });
});

// ── DELETE /api/todos/:id ─────────────────────────────────
describe("DELETE /api/todos/:id", () => {
  it("{ ok: true } を返す", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    const res = await req("/api/todos/123", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ── CORS ──────────────────────────────────────────────────
describe("CORS", () => {
  it("Origin ヘッダーを反映した Access-Control-Allow-Origin を返す", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [] }));
    const token = createTestToken();
    const res = await app.request(
      "/api/todos",
      { headers: { Origin: "http://localhost:5173", Authorization: `Bearer ${token}` } },
      ENV
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
});
