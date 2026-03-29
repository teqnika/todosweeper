import { useState, useRef } from "react";
import { SWIPE_THRESHOLD, getDirection, formatDate } from "../utils.js";
import styles from "./TodoCard.module.css";

export default function TodoCard({ todo, onSwipe, isTop, onEdit }) {
  const startRef = useRef(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const direction = getDirection(drag.x, drag.y);
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
      onEdit(todo);
    }
    setDrag({ x: 0, y: 0, active: false });
    startRef.current = null;
  }

  const overlayOpacity = direction
    ? Math.min(1, (Math.max(Math.abs(drag.x), Math.abs(drag.y)) - SWIPE_THRESHOLD * 0.3) / (SWIPE_THRESHOLD * 0.7))
    : 0;

  // directionConfigをここでimportせずに色だけ定義（CSS変数で渡す）
  const directionColors = {
    right: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "後回し" },
    left:  { color: "#4ade80", bg: "rgba(74,222,128,0.15)",  label: "完了" },
    up:    { color: "#f87171", bg: "rgba(248,113,113,0.15)", label: "削除" },
    down:  { color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  label: "優先度UP" },
  };
  const config = direction ? directionColors[direction] : null;

  return (
    <div
      className={isTop ? styles.wrapperTop : styles.wrapperBack}
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: 380,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`,
        transition: drag.active ? "none" : "transform 0.3s cubic-bezier(.175,.885,.32,1.275)",
        cursor: isTop ? (drag.active ? "grabbing" : "grab") : "default",
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={styles.card}>
        {config && isTop && (
          <div
            className={styles.directionOverlay}
            style={{
              "--overlay-bg": config.bg,
              "--overlay-color": config.color,
              opacity: overlayOpacity,
            }}
          >
            <div className={styles.directionLabel}>{config.label}</div>
          </div>
        )}

        {todo.priority > 0 && (
          <div className={styles.priorityBadge}>★ {todo.priority}</div>
        )}

        <div className={styles.glow} />

        <div className={styles.content}>
          <div className={styles.tag}>TODO</div>
          <h2 className={styles.title}>{todo.title}</h2>
          {todo.memo && <p className={styles.memo}>{todo.memo}</p>}
          {due && (
            <div className={styles.dueBadge} style={{ "--due-color": due.color }}>
              <span className={styles.dueLabel}>⏰ {due.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
