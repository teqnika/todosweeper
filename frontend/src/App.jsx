import { useState, useRef, useEffect } from "react";

// ── ユーティリティ ────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function formatDate(str) {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  const diff = Math.ceil((d - new Date(todayStr() + "T00:00:00")) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, color: "#f87171" };
  if (diff === 0) return { label: "今日まで", color: "#fbbf24" };
  if (diff === 1) return { label: "明日まで", color: "#fb923c" };
  return { label: `${diff}日後`, color: "rgba(255,255,255,0.4)" };
}

const INITIAL_TODOS = [
  { id: 1, title: "デザインレビュー", memo: "Figmaのモックアップを確認してフィードバックを送る", priority: 0, dueDate: todayStr(), snoozedUntil: null },
  { id: 2, title: "Cloudflare Workers設定", memo: "wrangler.tomlのdatabase_idを更新してデプロイ", priority: 0, dueDate: tomorrowStr(), snoozedUntil: null },
  { id: 3, title: "週次レポート作成", memo: "先週のKPIをまとめてSlackに投稿する", priority: 0, dueDate: null, snoozedUntil: null },
  { id: 4, title: "ジム", memo: "胸・三頭筋の日。プロテイン忘れずに", priority: 0, dueDate: null, snoozedUntil: null },
  { id: 5, title: "Mac mini環境整備", memo: "Ghostty + Starshipの設定を最終調整", priority: 0, dueDate: null, snoozedUntil: null },
];

const SWIPE_THRESHOLD = 80;
const directionConfig = {
  right: { label: "後回し",   color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  left:  { label: "完了",     color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  up:    { label: "削除",     color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  down:  { label: "優先度UP", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
};

function getDirection(dx, dy) {
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy < 0 ? "up" : "down";
}

// ── DeleteConfirmModal ────────────────────────────────────
function DeleteConfirmModal({ todo, onCancel, onConfirm }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, backdropFilter: "blur(8px)", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(160deg, #2a2438 0%, #242030 100%)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(248,113,113,0.08)" }}>
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🗑️</div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(248,113,113,0.6)", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>CONFIRM DELETE</div>
          <h3 style={{ margin: "0 0 8px", color: "#f1f0ff", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>このタスクを削除しますか？</h3>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
            削除したタスクはゴミ箱に移動されます。ゴミ箱から復元することができます。
          </p>
        </div>

        {/* Task preview */}
        <div style={{ background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "'Syne', sans-serif", marginBottom: todo.memo ? 4 : 0 }}>{todo.title}</div>
          {todo.memo && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{todo.memo}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "13px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          >キャンセル</button>
          <button onClick={onConfirm} style={{ flex: 2, background: "linear-gradient(135deg, #dc2626, #b91c1c)", border: "none", borderRadius: 14, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", boxShadow: "0 4px 20px rgba(220,38,38,0.35)", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >🗑️ ゴミ箱へ移動</button>
        </div>
      </div>
    </div>
  );
}

// ── TodoCard ─────────────────────────────────────────────
function TodoCard({ todo, onSwipe, isTop, onEdit }) {
  const startRef = useRef(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const direction = getDirection(drag.x, drag.y);
  const config = direction ? directionConfig[direction] : null;
  const rotation = drag.x * 0.08;
  const due = formatDate(todo.dueDate);

  function onPointerDown(e) {
    if (!isTop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  }
  function onPointerMove(e) {
    if (!drag.active || !startRef.current) return;
    setDrag(d => ({ ...d, x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y }));
  }
  function onPointerUp() {
    if (!drag.active) return;
    const dir = getDirection(drag.x, drag.y);
    const moved = Math.max(Math.abs(drag.x), Math.abs(drag.y));
    if (dir) {
      onSwipe(todo.id, dir);
    } else if (isTop && moved < 8) {
      // ほぼ動いていない = タップ → 編集モーダルを開く
      onEdit(todo);
    }
    setDrag({ x: 0, y: 0, active: false });
    startRef.current = null;
  }

  return (
    <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      style={{ position: "absolute", width: "100%", maxWidth: 380, left: "50%", top: "50%", transform: `translate(-50%, -50%) translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`, transition: drag.active ? "none" : "transform 0.3s cubic-bezier(.175,.885,.32,1.275)", cursor: isTop ? (drag.active ? "grabbing" : "grab") : "default", opacity: isTop ? 1 : 0.6, zIndex: isTop ? 10 : 5, userSelect: "none", touchAction: "none" }}
    >
      <div style={{ background: "linear-gradient(145deg, #28283e 0%, #222236 100%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: "32px 32px 28px", boxShadow: "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.11)", minHeight: 240, position: "relative", overflow: "hidden" }}>
        {config && isTop && (
          <div style={{ position: "absolute", inset: 0, background: config.bg, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, (Math.max(Math.abs(drag.x), Math.abs(drag.y)) - SWIPE_THRESHOLD * 0.3) / (SWIPE_THRESHOLD * 0.7)), transition: "opacity 0.1s", zIndex: 1 }}>
            <div style={{ border: `3px solid ${config.color}`, borderRadius: 12, padding: "8px 24px", color: config.color, fontSize: 26, fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: 2, transform: "rotate(-12deg)" }}>{config.label}</div>
          </div>
        )}
        {todo.priority > 0 && <div style={{ position: "absolute", top: 18, right: 18, background: "linear-gradient(135deg, #fbbf24, #f59e0b)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#1a1a2e", letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>★ {todo.priority}</div>}
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", marginBottom: 12, textTransform: "uppercase" }}>TODO</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#f1f0ff", margin: "0 0 12px", fontFamily: "'Syne', sans-serif", lineHeight: 1.2, letterSpacing: -0.5 }}>{todo.title}</h2>
          {todo.memo && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{todo.memo}</p>}
          {due && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${due.color}18`, border: `1px solid ${due.color}44`, borderRadius: 20, padding: "4px 12px" }}><span style={{ fontSize: 11, color: due.color, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>⏰ {due.label}</span></div>}
        </div>
      </div>
    </div>
  );
}

// ── ActionButton ─────────────────────────────────────────
function ActionButton({ emoji, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "rgba(255,255,255,0.11)", border: `1px solid ${color}33`, borderRadius: 16, padding: "12px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.2s", color, minWidth: 64 }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.transform = "scale(1.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.11)"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span style={{ fontSize: 9, letterSpacing: 1, fontFamily: "'DM Mono', monospace", opacity: 0.8 }}>{label}</span>
    </button>
  );
}

// ── BulkAddModal ─────────────────────────────────────────
function BulkAddModal({ onClose, onAdd }) {
  const [text, setText] = useState("");
  const parsed = text.split("\n").map(l => l.trim()).filter(Boolean);
  function handleAdd() { if (!parsed.length) return; onAdd(parsed); onClose(); }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, backdropFilter: "blur(6px)", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(160deg, #26263a 0%, #222236 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>BULK ADD</div>
            <h2 style={{ margin: 0, color: "#f1f0ff", fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>一括タスク登録</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "6px 12px", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>1行につき1タスクとして登録されます</div>
        <div style={{ position: "relative" }}>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={"タスクを1行ずつ入力...\n企画書作成\n議事録まとめ\nSlack確認"} rows={8}
            style={{ width: "100%", background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "16px", color: "#f1f0ff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", lineHeight: 1.9, boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.14)"}
          />
          {parsed.length > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(124,58,237,0.7)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#fff", fontWeight: 700, pointerEvents: "none" }}>{parsed.length} タスク</div>}
        </div>
        {parsed.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px", maxHeight: 130, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>PREVIEW</div>
            {parsed.map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: "rgba(124,58,237,0.6)", fontFamily: "'DM Mono', monospace", minWidth: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>キャンセル</button>
          <button onClick={handleAdd} disabled={!parsed.length} style={{ flex: 2, background: parsed.length ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 14, padding: "14px", color: parsed.length ? "#fff" : "rgba(255,255,255,0.2)", cursor: parsed.length ? "pointer" : "default", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", boxShadow: parsed.length ? "0 4px 20px rgba(124,58,237,0.4)" : "none", transition: "all 0.2s" }}>
            {parsed.length > 0 ? `${parsed.length}件を登録する` : "テキストを入力してください"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditModal ─────────────────────────────────────────────
function EditModal({ todo, onClose, onSave }) {
  const [memo, setMemo] = useState(todo.memo || "");
  const [dueDate, setDueDate] = useState(todo.dueDate || "");
  function handleSave() { onSave(todo.id, { memo, dueDate: dueDate || null }); onClose(); }
  const inputStyle = { width: "100%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 14px", color: "#f1f0ff", fontFamily: "'DM Sans', sans-serif", outline: "none", fontSize: 14, boxSizing: "border-box" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, backdropFilter: "blur(6px)", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(160deg, #26263a 0%, #222236 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: 28, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>EDIT TASK</div>
            <h3 style={{ margin: 0, color: "#f1f0ff", fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{todo.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "6px 12px", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>MEMO</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={4} placeholder="メモを入力..." style={{ ...inputStyle, resize: "none", lineHeight: 1.7 }}
            onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.14)"}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>期限</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
              onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.14)"}
            />
            {dueDate && <button onClick={() => setDueDate("")} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "0 14px", color: "#f87171", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>クリア</button>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["今日", todayStr()], ["明日", tomorrowStr()]].map(([label, val]) => (
              <button key={label} onClick={() => setDueDate(val)} style={{ background: dueDate === val ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.12)", border: `1px solid ${dueDate === val ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.12)"}`, borderRadius: 20, padding: "4px 14px", color: dueDate === val ? "#c4b5fd" : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "13px", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>キャンセル</button>
          <button onClick={handleSave} style={{ flex: 2, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 14, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>保存する</button>
        </div>
      </div>
    </div>
  );
}

// ── タスク一覧画面 ────────────────────────────────────────
function ListView({ todos, done, trash, onBack, onEdit, onComplete, onDelete, onUncomplete, onRestore, onPermanentDelete }) {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "done" ? done : filter === "active" ? todos : filter === "trash" ? trash : [...todos, ...done];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #1c1c2e 0%, #18182a 60%, #1c1a2e 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "8px 14px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >←</button>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>All Tasks</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f0ff", margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: -1 }}>タスク一覧</h1>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 3, marginTop: 20, background: "rgba(255,255,255,0.11)", borderRadius: 12, padding: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {[["all", `全て ${todos.length + done.length}`], ["active", `未完了 ${todos.length}`], ["done", `完了 ${done.length}`], ["trash", `🗑️ ${trash.length}`]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{ background: filter === key ? (key === "trash" ? "rgba(248,113,113,0.4)" : "rgba(124,58,237,0.6)") : "transparent", border: "none", borderRadius: 8, padding: "6px 14px", color: filter === key ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s", fontWeight: filter === key ? 700 : 400, whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      {/* ゴミ箱一括削除 */}
      {filter === "trash" && trash.length > 0 && (
        <button onClick={() => onPermanentDelete(null)} style={{ marginTop: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "8px 20px", color: "#f87171", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
        >ゴミ箱を空にする</button>
      )}

      <div style={{ width: "100%", maxWidth: 480, padding: "16px 24px 40px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 13, marginTop: 48, letterSpacing: 2 }}>{filter === "trash" ? "ゴミ箱は空です 🎉" : "タスクがありません"}</div>}
        {filtered.map(todo => {
          const isDone = done.some(d => d.id === todo.id);
          const isTrashed = trash.some(t => t.id === todo.id);
          const due = formatDate(todo.dueDate);
          return (
            <div key={todo.id} style={{ background: isTrashed ? "rgba(248,113,113,0.04)" : isDone ? "rgba(74,222,128,0.05)" : "linear-gradient(145deg, #28283e, #222236)", border: `1px solid ${isTrashed ? "rgba(248,113,113,0.12)" : isDone ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.11)"}`, borderRadius: 18, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isTrashed ? "rgba(255,255,255,0.3)" : isDone ? "rgba(255,255,255,0.4)" : "#f1f0ff", fontFamily: "'Syne', sans-serif", textDecoration: isDone || isTrashed ? "line-through" : "none", lineHeight: 1.3 }}>{todo.title}</div>
                  {todo.memo && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{todo.memo}</div>}
                  {due && !isDone && !isTrashed && (
                    <div style={{ display: "inline-flex", alignItems: "center", marginTop: 6, background: `${due.color}14`, border: `1px solid ${due.color}33`, borderRadius: 20, padding: "2px 10px" }}>
                      <span style={{ fontSize: 10, color: due.color, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>⏰ {due.label}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {isTrashed ? (
                    <>
                      <button onClick={() => onRestore(todo.id)} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "6px 10px", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.22)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}
                      >↩ 復元</button>
                      <button onClick={() => onPermanentDelete(todo.id)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 10, padding: "6px 10px", color: "#f87171", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                      >完全削除</button>
                    </>
                  ) : isDone ? (
                    <button onClick={() => onUncomplete(todo.id)} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "6px 10px", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.22)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}
                    >↩ 戻す</button>
                  ) : (
                    <>
                      <button onClick={() => setEditTarget(todo)} style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "6px 10px", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.25)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.12)"}
                      >編集</button>
                      <button onClick={() => onComplete(todo.id)} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "6px 10px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.22)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(74,222,128,0.1)"}
                      >✓</button>
                      <button onClick={() => setDeleteTarget(todo)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 10, padding: "6px 10px", color: "#f87171", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                      >🗑️</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editTarget && <EditModal todo={editTarget} onClose={() => setEditTarget(null)} onSave={(id, updates) => { onEdit(id, updates); setEditTarget(null); }} />}
      {deleteTarget && <DeleteConfirmModal todo={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }} />}
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────
export default function App() {
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
  const [deleteTarget, setDeleteTarget] = useState(null); // スワイプ削除確認用
  const [editingTodo, setEditingTodo] = useState(null); // カードタップ編集用

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const visibleTodos = todos.filter(t => !t.snoozedUntil || t.snoozedUntil <= todayStr());
  const snoozedCount = todos.filter(t => t.snoozedUntil && t.snoozedUntil > todayStr()).length;

  function showToast(msg, color) { setToast({ msg, color }); setTimeout(() => setToast(null), 1800); }

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
    if (direction === "up") {
      // 削除は確認モーダルを出す
      setDeleteTarget(todo);
      return;
    }
    setHistory(h => [...h, { todos: [...todos], done: [...done], trash: [...trash] }]);
    if (direction === "left") {
      setDone(d => [todo, ...d]); setTodos(t => t.filter(x => x.id !== id));
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
    setDone(d => [todo, ...d]); setTodos(t => t.filter(x => x.id !== id));
    showToast("完了！", "#4ade80");
  }

  function handleUncomplete(id) {
    const todo = done.find(d => d.id === id);
    if (!todo) return;
    setDone(d => d.filter(x => x.id !== id)); setTodos(t => [todo, ...t]);
    showToast("未完了に戻しました", "#a78bfa");
  }

  function handleRestore(id) {
    const todo = trash.find(t => t.id === id);
    if (!todo) return;
    const { trashedAt, ...restored } = todo;
    setTrash(tr => tr.filter(x => x.id !== id)); setTodos(t => [restored, ...t]);
    showToast("復元しました", "#a78bfa");
  }

  function handlePermanentDelete(id) {
    if (id === null) { setTrash([]); showToast("ゴミ箱を空にしました", "#f87171"); }
    else { setTrash(tr => tr.filter(x => x.id !== id)); showToast("完全に削除しました", "#f87171"); }
  }

  const stackTodos = visibleTodos.slice(0, 2);
  const currentTop = visibleTodos[0];
  const inputStyle = { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 16px", color: "#f1f0ff", fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

  // ── 一覧画面 ──
  if (screen === "list") {
    return (
      <>
        <ListView todos={todos} done={done} trash={trash} onBack={() => setScreen("main")} onEdit={handleEdit} onComplete={handleCompleteFromList} onDelete={(id) => moveToTrash(id, true)} onUncomplete={handleUncomplete} onRestore={handleRestore} onPermanentDelete={handlePermanentDelete} />
        {toast && <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#28283e", border: `1px solid ${toast.color}44`, color: toast.color, padding: "10px 24px", borderRadius: 40, fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono', monospace", zIndex: 200, letterSpacing: 0.5, animation: "fadeIn 0.2s ease" }}>{toast.msg}</div>}
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)}`}</style>
      </>
    );
  }

  // ── メイン画面 ──
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #1c1c2e 0%, #18182a 60%, #1c1a2e 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {toast && <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#28283e", border: `1px solid ${toast.color}44`, color: toast.color, padding: "10px 24px", borderRadius: 40, fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono', monospace", zIndex: 100, letterSpacing: 0.5, animation: "fadeIn 0.2s ease" }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, padding: "24px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>Swipe</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f0ff", margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: -1 }}>Todo</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setScreen("list")} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "8px 13px", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", transition: "all 0.2s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            ☰
            {(snoozedCount > 0 || trash.length > 0) && <span style={{ position: "absolute", top: -4, right: -4, background: trash.length > 0 ? "#f87171" : "#60a5fa", borderRadius: "50%", width: 14, height: 14, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{trash.length || snoozedCount}</span>}
          </button>
          <button onClick={handleUndo} disabled={!history.length} style={{ background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 14px", color: history.length ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)", cursor: history.length ? "pointer" : "default", fontSize: 14, fontFamily: "'DM Mono', monospace" }}>↩</button>
          <button onClick={() => setShowBulk(true)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "8px 13px", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", letterSpacing: 0.5 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.2)"; e.currentTarget.style.color = "#c4b5fd"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >≡+</button>
          <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 12, padding: "8px 18px", color: "#fff", cursor: "pointer", fontSize: 20, fontWeight: 700, lineHeight: 1, boxShadow: "0 4px 16px rgba(124,58,237,0.4)", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >+</button>
        </div>
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: 4, marginTop: 20, background: "rgba(255,255,255,0.11)", borderRadius: 12, padding: 4 }}>
        {[["stack", `残り ${visibleTodos.length}`], ["done", `完了 ${done.length}`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: tab === key ? "rgba(124,58,237,0.6)" : "transparent", border: "none", borderRadius: 8, padding: "6px 20px", color: tab === key ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", transition: "all 0.2s", fontWeight: tab === key ? 700 : 400 }}>{label}</button>
        ))}
      </div>

      {/* Card Stack */}
      {tab === "stack" && (
        <>
          <div style={{ position: "relative", width: "100%", maxWidth: 480, height: 320, margin: "20px 0 14px", padding: "0 24px" }}>
            {visibleTodos.length === 0 ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", gap: 8 }}>
                <div style={{ fontSize: 40 }}>🎉</div>
                <div style={{ fontSize: 14, letterSpacing: 2 }}>ALL DONE</div>
                {snoozedCount > 0 && <div style={{ fontSize: 12, color: "#60a5fa88" }}>💤 {snoozedCount}件が明日まで非表示</div>}
              </div>
            ) : (
              [...stackTodos].reverse().map((todo, i) => (
                <TodoCard key={todo.id} todo={todo} onSwipe={handleSwipe} isTop={i === stackTodos.length - 1} onEdit={todo => setEditingTodo(todo)} />
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "0 24px", flexWrap: "wrap" }}>
            {[["left","✓","完了"],["up","🗑️","削除"],["down","★","優先度"],["right","→","後回し"]].map(([dir, emoji, label]) => (
              <ActionButton key={dir} emoji={emoji} label={label} color={directionConfig[dir].color}
                onClick={() => visibleTodos.length > 0 && handleSwipe(visibleTodos[0].id, dir)} />
            ))}
          </div>

          {currentTop && (
            <button onClick={() => handleSnooze(currentTop.id)} style={{ marginTop: 14, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 14, padding: "10px 28px", color: "#60a5fa", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", letterSpacing: 0.5, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(96,165,250,0.18)"; e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(96,165,250,0.08)"; e.currentTarget.style.transform = "scale(1)"; }}
            >💤 明日まで表示しない</button>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 16, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1, flexWrap: "wrap", justifyContent: "center", padding: "0 24px" }}>
            {Object.entries(directionConfig).map(([dir, cfg]) => (
              <span key={dir} style={{ color: cfg.color + "77" }}>{dir === "right" ? "→" : dir === "left" ? "←" : dir === "up" ? "↑" : "↓"} {cfg.label}</span>
            ))}
          </div>
        </>
      )}

      {/* Done list */}
      {tab === "done" && (
        <div style={{ width: "100%", maxWidth: 480, padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: "60vh" }}>
          {done.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 13, marginTop: 40, letterSpacing: 2 }}>まだ完了したタスクはありません</div>
          ) : done.map(todo => (
            <div key={todo.id} style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                <span style={{ color: "#4ade80", fontSize: 16, flexShrink: 0 }}>✓</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, textDecoration: "line-through" }}>{todo.title}</div>
                  {todo.memo && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 2 }}>{todo.memo}</div>}
                </div>
              </div>
              <button onClick={() => handleUncomplete(todo.id)} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "6px 12px", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", flexShrink: 0, transition: "all 0.2s", whiteSpace: "nowrap" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}
              >↩ 戻す</button>
            </div>
          ))}
        </div>
      )}

      {/* Single add modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#28283e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 0 0", padding: 32, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ margin: 0, color: "#f1f0ff", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>新しいTodo</h3>
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="タイトル" style={{ ...inputStyle, fontSize: 16 }} />
            <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="メモ（任意）" rows={3} style={{ ...inputStyle, fontSize: 14, resize: "none" }} />
            <button onClick={handleAdd} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>追加する</button>
          </div>
        </div>
      )}

      {showBulk && <BulkAddModal onClose={() => setShowBulk(false)} onAdd={handleBulkAdd} />}

      {/* スワイプ削除確認モーダル */}
      {deleteTarget && <DeleteConfirmModal todo={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmSwipeDelete} />}

      {/* カードタップ編集モーダル */}
      {editingTodo && <EditModal todo={editingTodo} onClose={() => setEditingTodo(null)} onSave={(id, updates) => { handleEdit(id, updates); setEditingTodo(null); }} />}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)}`}</style>
    </div>
  );
}
