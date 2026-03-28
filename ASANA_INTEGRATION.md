# App.jsx — Asana 統合パッチ
# 以下の箇所を変更してください

## 1. import 追加（ファイル先頭）

```diff
+ import {
+   fetchTodos, createTodo, bulkCreateTodos,
+   updateTodo, completeTodo, deleteTodo,
+ } from "./api";
```

---

## 2. state 初期化を変更

```diff
- const [todos, setTodos] = useState(INITIAL_TODOS);
- const [done, setDone] = useState([]);
- const [trash, setTrash] = useState([]);
+ const [todos, setTodos] = useState([]);
+ const [done, setDone] = useState([]);
+ const [trash, setTrash] = useState([]);
+ const [loading, setLoading] = useState(true);
```

---

## 3. useEffect で初回データ取得

```diff
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500;700&display=swap";
    document.head.appendChild(link);
+
+   // Asana からタスク一覧を取得して active / done に振り分け
+   fetchTodos().then((all) => {
+     setTodos(all.filter((t) => !t.completed));
+     setDone(all.filter((t) => t.completed));
+     setLoading(false);
+   }).catch(() => setLoading(false));
  }, []);
```

---

## 4. handleSwipe — 削除以外の操作を API と同期

```diff
  function handleSwipe(id, direction) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    if (direction === "up") { setDeleteTarget(todo); return; }
    setHistory(h => [...h, { todos: [...todos], done: [...done], trash: [...trash] }]);

    if (direction === "left") {
+     completeTodo(id, true);   // Asana を完了に
      setDone(d => [todo, ...d]); setTodos(t => t.filter(x => x.id !== id));
      showToast("完了！", "#4ade80");
    } else if (direction === "right") {
      setTodos(t => [...t.filter(x => x.id !== id), todo]);
      showToast("後回しにしました", "#a78bfa");
    } else if (direction === "down") {
      const newPriority = todo.priority + 1;
+     updateTodo(id, { priority: newPriority });   // Asana に優先度を保存
      setTodos(t => {
        const updated = t.map(x => x.id === id ? { ...x, priority: newPriority } : x);
        return [...updated.filter(x => x.id !== id).sort((a,b) => b.priority - a.priority),
                updated.find(x => x.id === id)].filter(Boolean);
      });
      showToast("優先度UP ★", "#fbbf24");
    }
  }
```

---

## 5. moveToTrash — Asana からタスクを削除

```diff
  function moveToTrash(id, fromTodos = true) {
    const todo = fromTodos ? todos.find(t => t.id === id) : done.find(d => d.id === id);
    if (!todo) return;
+   deleteTodo(id);   // Asana から削除
    setTrash(tr => [{ ...todo, trashedAt: new Date().toISOString() }, ...tr]);
    if (fromTodos) setTodos(t => t.filter(x => x.id !== id));
    else setDone(d => d.filter(x => x.id !== id));
    showToast("ゴミ箱に移動しました 🗑️", "#f87171");
  }
```

---

## 6. handleSnooze — Asana にスヌーズ情報を保存

```diff
  function handleSnooze(id) {
+   updateTodo(id, { dueDate: tomorrowStr(), snoozedUntil: tomorrowStr() });
    setTodos(t => t.map(x => x.id === id
      ? { ...x, dueDate: tomorrowStr(), snoozedUntil: tomorrowStr() }
      : x
    ));
    showToast("明日まで非表示にしました 💤", "#60a5fa");
  }
```

---

## 7. handleAdd — Asana にタスク作成

```diff
  async function handleAdd() {
    if (!newTitle.trim()) return;
-   setTodos(t => [{ id: Date.now(), title: newTitle.trim(), memo: newMemo.trim(),
-     priority: 0, dueDate: null, snoozedUntil: null }, ...t]);
+   const created = await createTodo({ title: newTitle.trim(), memo: newMemo.trim() });
+   setTodos(t => [created, ...t]);
    setNewTitle(""); setNewMemo(""); setShowAdd(false);
    showToast("追加しました", "#60a5fa");
  }
```

---

## 8. handleBulkAdd — Asana に一括作成

```diff
  async function handleBulkAdd(lines) {
-   const newTodos = lines.map((line, i) => ({
-     id: Date.now() + i, title: line, memo: "", priority: 0,
-     dueDate: null, snoozedUntil: null
-   }));
+   const newTodos = await bulkCreateTodos(lines);
    setTodos(t => [...newTodos, ...t]);
    showToast(`${lines.length}件を登録しました`, "#60a5fa");
  }
```

---

## 9. handleEdit — Asana に保存

```diff
  function handleEdit(id, updates) {
+   updateTodo(id, updates);
    setTodos(t => t.map(x => x.id === id ? { ...x, ...updates } : x));
    showToast("保存しました", "#60a5fa");
  }
```

---

## 10. handleUncomplete — Asana で未完了に戻す

```diff
  function handleUncomplete(id) {
    const todo = done.find(d => d.id === id);
    if (!todo) return;
+   completeTodo(id, false);
    setDone(d => d.filter(x => x.id !== id)); setTodos(t => [todo, ...t]);
    showToast("未完了に戻しました", "#a78bfa");
  }
```

---

## 11. ローディング表示（Card Stack 内）

```diff
  {tab === "stack" && (
    <>
      <div style={{ position: "relative", ... }}>
+       {loading ? (
+         <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
+           justifyContent: "center", color: "rgba(255,255,255,0.3)",
+           fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: 2 }}>
+           Loading...
+         </div>
+       ) : visibleTodos.length === 0 ? (
          ...
```

---

## 12. .env.local に API URL を設定

```
VITE_API_URL=http://localhost:8787   # ローカル開発時
# 本番は Cloudflare Pages の環境変数に設定
```
