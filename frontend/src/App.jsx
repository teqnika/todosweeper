import { useState, useEffect } from "react";
import { todayStr, tomorrowStr, directionConfig } from "./utils.js";
import { fetchMe, saveToken, clearToken } from "./api.ts";
import TodoCard from "./components/TodoCard.jsx";
import ActionButton from "./components/ActionButton.jsx";
import BulkAddModal from "./components/BulkAddModal.jsx";
import EditModal from "./components/EditModal.jsx";
import DeleteConfirmModal from "./components/DeleteConfirmModal.jsx";
import ListView from "./components/ListView.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import styles from "./App.module.css";

// VITE_API_URL が設定されていて VITE_SKIP_AUTH が未設定のとき認証が必要
const AUTH_REQUIRED =
  !!import.meta.env.VITE_API_URL && import.meta.env.VITE_SKIP_AUTH !== "true";

const INITIAL_TODOS = [
  { id: 1, title: "デザインレビュー", memo: "Figmaのモックアップを確認してフィードバックを送る", priority: 0, dueDate: todayStr(), snoozedUntil: null },
  { id: 2, title: "Cloudflare Workers設定", memo: "wrangler.tomlのdatabase_idを更新してデプロイ", priority: 0, dueDate: tomorrowStr(), snoozedUntil: null },
  { id: 3, title: "週次レポート作成", memo: "先週のKPIをまとめてSlackに投稿する", priority: 0, dueDate: null, snoozedUntil: null },
  { id: 4, title: "ジム", memo: "胸・三頭筋の日。プロテイン忘れずに", priority: 0, dueDate: null, snoozedUntil: null },
  { id: 5, title: "Mac mini環境整備", memo: "Ghostty + Starshipの設定を最終調整", priority: 0, dueDate: null, snoozedUntil: null },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(AUTH_REQUIRED);

  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [done, setDone] = useState([]);
  const [trash, setTrash] = useState([]);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [tab, setTab] = useState("stack");
  const [screen, setScreen] = useState("main");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    // OAuth コールバック後の ?token= パラメータを処理
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      saveToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
    // トークンを検証してユーザー情報を取得
    fetchMe().then((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const visibleTodos = todos.filter(t => !t.snoozedUntil || t.snoozedUntil <= todayStr());
  const snoozedCount = todos.filter(t => t.snoozedUntil && t.snoozedUntil > todayStr()).length;
  const stackTodos = visibleTodos.slice(0, 2);
  const currentTop = visibleTodos[0];

  function showToast(msg, color) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 1800);
  }

  function moveToTrash(id, fromTodos = true) {
    const todo = fromTodos ? todos.find(t => t.id === id) : done.find(d => d.id === id);
    if (!todo) return;
    setTrash(tr => [{ ...todo, trashedAt: new Date().toISOString() }, ...tr]);
    if (fromTodos) setTodos(t => t.filter(x => x.id !== id));
    else setDone(d => d.filter(x => x.id !== id));
    showToast("ゴミ箱に移動しました 🗑️", "#f87171");
  }

  function handleSwipe(id, direction) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    if (direction === "up") { setDeleteTarget(todo); return; }
    setHistory(h => [...h, { todos: [...todos], done: [...done], trash: [...trash] }]);
    if (direction === "left") {
      setDone(d => [todo, ...d]);
      setTodos(t => t.filter(x => x.id !== id));
      showToast("完了！", "#4ade80");
    } else if (direction === "right") {
      setTodos(t => [...t.filter(x => x.id !== id), todo]);
      showToast("後回しにしました", "#a78bfa");
    } else if (direction === "down") {
      setTodos(t => {
        const updated = t.map(x => x.id === id ? { ...x, priority: x.priority + 1 } : x);
        return [...updated.filter(x => x.id !== id).sort((a, b) => b.priority - a.priority), updated.find(x => x.id === id)].filter(Boolean);
      });
      showToast("優先度UP ★", "#fbbf24");
    }
  }

  function confirmSwipeDelete() {
    if (!deleteTarget) return;
    setHistory(h => [...h, { todos: [...todos], done: [...done], trash: [...trash] }]);
    moveToTrash(deleteTarget.id, true);
    setDeleteTarget(null);
  }

  function handleSnooze(id) {
    setTodos(t => t.map(x => x.id === id ? { ...x, dueDate: tomorrowStr(), snoozedUntil: tomorrowStr() } : x));
    showToast("明日まで非表示にしました 💤", "#60a5fa");
  }

  function handleUndo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setTodos(prev.todos); setDone(prev.done); setTrash(prev.trash);
    setHistory(h => h.slice(0, -1));
    showToast("元に戻しました", "#94a3b8");
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    setTodos(t => [{ id: Date.now(), title: newTitle.trim(), memo: newMemo.trim(), priority: 0, dueDate: null, snoozedUntil: null }, ...t]);
    setNewTitle(""); setNewMemo(""); setShowAdd(false);
    showToast("追加しました", "#60a5fa");
  }

  function handleBulkAdd(lines) {
    const newTodos = lines.map((line, i) => ({ id: Date.now() + i, title: line, memo: "", priority: 0, dueDate: null, snoozedUntil: null }));
    setTodos(t => [...newTodos, ...t]);
    showToast(`${lines.length}件を登録しました`, "#60a5fa");
  }

  function handleEdit(id, updates) {
    setTodos(t => t.map(x => x.id === id ? { ...x, ...updates } : x));
    showToast("保存しました", "#60a5fa");
  }

  function handleCompleteFromList(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    setDone(d => [todo, ...d]);
    setTodos(t => t.filter(x => x.id !== id));
    showToast("完了！", "#4ade80");
  }

  function handleUncomplete(id) {
    const todo = done.find(d => d.id === id);
    if (!todo) return;
    setDone(d => d.filter(x => x.id !== id));
    setTodos(t => [todo, ...t]);
    showToast("未完了に戻しました", "#a78bfa");
  }

  function handleRestore(id) {
    const todo = trash.find(t => t.id === id);
    if (!todo) return;
    const { trashedAt, ...restored } = todo;
    setTrash(tr => tr.filter(x => x.id !== id));
    setTodos(t => [restored, ...t]);
    showToast("復元しました", "#a78bfa");
  }

  function handlePermanentDelete(id) {
    if (id === null) { setTrash([]); showToast("ゴミ箱を空にしました", "#f87171"); }
    else { setTrash(tr => tr.filter(x => x.id !== id)); showToast("完全に削除しました", "#f87171"); }
  }

  // 認証チェック中
  if (authLoading) {
    return <div className={styles.authLoading} />;
  }

  // 未ログイン
  if (AUTH_REQUIRED && !user) {
    return <LoginScreen />;
  }

  const Toast = toast && (
    <div className={styles.toast} style={{ "--toast-color": toast.color }}>
      {toast.msg}
    </div>
  );

  // ── 一覧画面 ──
  if (screen === "list") {
    return (
      <>
        <ListView
          todos={todos} done={done} trash={trash}
          onBack={() => setScreen("main")}
          onEdit={handleEdit}
          onComplete={handleCompleteFromList}
          onDelete={(id) => moveToTrash(id, true)}
          onUncomplete={handleUncomplete}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
        {Toast}
      </>
    );
  }

  // ── メイン画面 ──
  const notifCount = trash.length || snoozedCount;
  const notifColor = trash.length > 0 ? "#f87171" : "#60a5fa";

  return (
    <div className={styles.app}>
      <div className={styles.bgGlow} />
      {Toast}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerLabel}>Swipe</div>
          <h1 className={styles.headerTitle}>Todo</h1>
        </div>
        <div className={styles.headerActions}>
          {user && (
            <button
              className={styles.btnUser}
              onClick={() => { clearToken(); setUser(null); }}
              title={`${user.name} (${user.email}) — クリックでログアウト`}
            >
              <img src={user.picture} alt={user.name} className={styles.userAvatar} referrerPolicy="no-referrer" />
            </button>
          )}
          <button className={styles.btnIcon} onClick={() => setScreen("list")}>
            ☰
            {notifCount > 0 && (
              <span className={styles.notifBadge} style={{ background: notifColor }}>
                {notifCount}
              </span>
            )}
          </button>
          <button
            className={`${styles.btnUndo} ${history.length ? styles.btnUndoEnabled : styles.btnUndoDisabled}`}
            onClick={handleUndo}
            disabled={!history.length}
          >↩</button>
          <button className={styles.btnBulk} onClick={() => setShowBulk(true)}>≡+</button>
          <button className={styles.btnAdd} onClick={() => setShowAdd(true)}>+</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[["stack", `残り ${visibleTodos.length}`], ["done", `完了 ${done.length}`]].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card Stack */}
      {tab === "stack" && (
        <>
          <div className={styles.cardStack}>
            {visibleTodos.length === 0 ? (
              <div className={styles.emptyStack}>
                <div className={styles.emptyStackEmoji}>🎉</div>
                <div className={styles.emptyStackLabel}>ALL DONE</div>
                {snoozedCount > 0 && (
                  <div className={styles.emptyStackSnoozed}>💤 {snoozedCount}件が明日まで非表示</div>
                )}
              </div>
            ) : (
              [...stackTodos].reverse().map((todo, i) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onSwipe={handleSwipe}
                  isTop={i === stackTodos.length - 1}
                  onEdit={todo => setEditingTodo(todo)}
                />
              ))
            )}
          </div>

          <div className={styles.actionButtons}>
            {[["left","✓","完了"],["up","🗑️","削除"],["down","★","優先度"],["right","→","後回し"]].map(([dir, emoji, label]) => (
              <ActionButton
                key={dir}
                emoji={emoji}
                label={label}
                color={directionConfig[dir].color}
                onClick={() => visibleTodos.length > 0 && handleSwipe(visibleTodos[0].id, dir)}
              />
            ))}
          </div>

          {currentTop && (
            <button className={styles.snoozeBtn} onClick={() => handleSnooze(currentTop.id)}>
              💤 明日まで表示しない
            </button>
          )}

          <div className={styles.swipeHints}>
            {Object.entries(directionConfig).map(([dir, cfg]) => (
              <span key={dir} style={{ color: cfg.color + "77" }}>
                {dir === "right" ? "→" : dir === "left" ? "←" : dir === "up" ? "↑" : "↓"} {cfg.label}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Done tab */}
      {tab === "done" && (
        <div className={styles.doneList}>
          {done.length === 0 ? (
            <div className={styles.doneEmpty}>まだ完了したタスクはありません</div>
          ) : done.map(todo => (
            <div key={todo.id} className={styles.doneRow}>
              <div className={styles.doneRowLeft}>
                <span className={styles.doneCheck}>✓</span>
                <div className={styles.doneTitleWrap}>
                  <div className={styles.doneTitle}>{todo.title}</div>
                  {todo.memo && <div className={styles.doneMemo}>{todo.memo}</div>}
                </div>
              </div>
              <button className={styles.btnUncomplete} onClick={() => handleUncomplete(todo.id)}>
                ↩ 戻す
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Single add modal */}
      {showAdd && (
        <div className={styles.addOverlay} onClick={() => setShowAdd(false)}>
          <div className={styles.addSheet} onClick={e => e.stopPropagation()}>
            <h3 className={styles.addTitle}>新しいTodo</h3>
            <input
              autoFocus
              className={styles.textInput}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="タイトル"
            />
            <textarea
              className={styles.textareaInput}
              value={newMemo}
              onChange={e => setNewMemo(e.target.value)}
              placeholder="メモ（任意）"
              rows={3}
            />
            <button className={styles.btnSubmit} onClick={handleAdd}>追加する</button>
          </div>
        </div>
      )}

      {showBulk && <BulkAddModal onClose={() => setShowBulk(false)} onAdd={handleBulkAdd} />}
      {deleteTarget && <DeleteConfirmModal todo={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmSwipeDelete} />}
      {editingTodo && <EditModal todo={editingTodo} onClose={() => setEditingTodo(null)} onSave={(id, updates) => { handleEdit(id, updates); setEditingTodo(null); }} />}
    </div>
  );
}
