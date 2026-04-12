import { useState, useEffect } from "react";
import { todayStr, formatDate } from "../utils.js";
import styles from "./ControlPanel.module.css";

export default function ControlPanel({
  todos,
  done,
  trash,
  history,
  user,
  onLogout,
  onSwipe,
  onSnooze,
  onUndo,
  onUncomplete,
  onShowAdd,
  onShowBulk,
  onSwitchToList,
  onSwitchToSwipe,
  setDeleteTarget,
  setEditingTodo,
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [timerMode, setTimerMode] = useState("idle"); // "idle" | "focus" | "break"
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);

  const visibleTodos = todos.filter(
    (t) => !t.snoozedUntil || t.snoozedUntil <= todayStr()
  );
  const snoozedCount = todos.filter(
    (t) => t.snoozedUntil && t.snoozedUntil > todayStr()
  ).length;

  const safeIndex = Math.min(focusIndex, Math.max(0, visibleTodos.length - 1));
  const currentTask = visibleTodos[safeIndex] ?? null;

  // Reset focus index when task is completed/removed
  useEffect(() => {
    if (focusIndex >= visibleTodos.length && visibleTodos.length > 0) {
      setFocusIndex(0);
    }
  }, [visibleTodos.length, focusIndex]);

  // Timer countdown
  useEffect(() => {
    if (timerMode === "idle") return;
    const id = setInterval(() => {
      setTimerSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerMode]);

  // Timer completion
  useEffect(() => {
    if (timerSeconds === 0 && timerMode !== "idle") {
      if (timerMode === "focus") {
        setTimerMode("break");
        setTimerSeconds(5 * 60);
      } else {
        setTimerMode("idle");
        setTimerSeconds(25 * 60);
      }
    }
  }, [timerSeconds, timerMode]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        onUndo();
        return;
      }

      if (!currentTask) return;

      if (e.key === " ") {
        e.preventDefault();
        onSwipe(currentTask.id, "left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSwipe(currentTask.id, "right");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSwipe(currentTask.id, "down");
      } else if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSnooze(currentTask.id);
      } else if (e.key === "Delete") {
        e.preventDefault();
        setDeleteTarget(currentTask);
      } else if ((e.key === "e" || e.key === "E") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditingTodo(currentTask);
      } else if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleTimer();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentTask, onSwipe, onSnooze, onUndo, setDeleteTarget, setEditingTodo, timerMode]);

  function toggleTimer() {
    if (timerMode === "idle") {
      setTimerMode("focus");
      setTimerSeconds(25 * 60);
    } else {
      setTimerMode("idle");
      setTimerSeconds(25 * 60);
    }
  }

  const timerMax = timerMode === "break" ? 5 * 60 : 25 * 60;
  const timerProgress = timerMode === "idle" ? 0 : 1 - timerSeconds / timerMax;
  const timerMins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const timerSecs = String(timerSeconds % 60).padStart(2, "0");

  const totalTasks = done.length + visibleTodos.length;
  const progressPct = totalTasks > 0 ? Math.round((done.length / totalTasks) * 100) : 0;

  const actions = [
    { cls: "actionGreen",  icon: "✓",  label: "完了",    kbd: "Space", onClick: () => onSwipe(currentTask?.id, "left") },
    { cls: "actionPurple", icon: "→",  label: "後回し",  kbd: "→",     onClick: () => onSwipe(currentTask?.id, "right") },
    { cls: "actionYellow", icon: "★",  label: "優先度+", kbd: "↑",     onClick: () => onSwipe(currentTask?.id, "down") },
    { cls: "actionBlue",   icon: "💤", label: "スヌーズ", kbd: "S",    onClick: () => onSnooze(currentTask?.id) },
    { cls: "actionRed",    icon: "🗑", label: "削除",    kbd: "Del",   onClick: () => setDeleteTarget(currentTask) },
    { cls: "actionMuted",  icon: "✏", label: "編集",    kbd: "E",     onClick: () => setEditingTodo(currentTask) },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.scanlines} aria-hidden="true" />

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.sysLabel}>TODO</span>
          <span className={styles.sysName}>MISSION CONTROL</span>
          <span className={styles.statusDot} data-mode={timerMode} />
          <span className={styles.sysStatus}>
            {timerMode === "idle" ? "STANDBY" : timerMode === "focus" ? "FOCUS" : "BREAK"}
          </span>
        </div>
        <div className={styles.headerRight}>
          {user && (
            <button className={styles.btnUser} onClick={onLogout} title={`${user.name} — ログアウト`}>
              <img src={user.picture} alt={user.name} className={styles.userAvatar} referrerPolicy="no-referrer" />
            </button>
          )}
          <button className={styles.headerBtn} onClick={onUndo} disabled={!history.length} title="Undo (Ctrl+Z)">
            ↩ UNDO
          </button>
          <button className={styles.headerBtn} onClick={onShowBulk} title="一括追加">≡+</button>
          <button className={styles.headerBtn} onClick={onSwitchToSwipe} title="スワイプ表示">≈ SWIPE</button>
          <button className={styles.headerBtn} onClick={onSwitchToList} title="一覧表示">☰ LIST</button>
          <button className={styles.headerBtnPrimary} onClick={onShowAdd} title="タスク追加">+ ADD</button>
        </div>
      </header>

      {/* ── Three-column grid ── */}
      <div className={styles.grid}>

        {/* ── LEFT: Task Queue ── */}
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>TASK QUEUE</span>
            <span className={styles.panelCount}>{visibleTodos.length}</span>
          </div>
          <div className={styles.queueList}>
            {visibleTodos.length === 0 ? (
              <div className={styles.emptyMsg}>[ QUEUE EMPTY ]</div>
            ) : (
              visibleTodos.map((todo, i) => {
                const due = formatDate(todo.dueDate);
                return (
                  <button
                    key={todo.id}
                    className={`${styles.queueItem} ${i === safeIndex ? styles.queueItemActive : ""}`}
                    onClick={() => setFocusIndex(i)}
                  >
                    <span className={styles.queueIdx}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.queueTitle}>{todo.title}</span>
                    <div className={styles.queueMeta}>
                      {todo.priority > 0 && (
                        <span className={styles.queuePriority}>{"★".repeat(Math.min(todo.priority, 5))}</span>
                      )}
                      {due && (
                        <span className={styles.queueDue} style={{ "--due-color": due.color }}>
                          {due.label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {snoozedCount > 0 && (
            <div className={styles.snoozedNote}>💤 {snoozedCount}件が非表示中</div>
          )}
        </aside>

        {/* ── CENTER: Focus Station ── */}
        <main className={`${styles.panel} ${styles.focusPanel}`}>
          {/* Pomodoro Timer */}
          <div className={styles.timerSection}>
            <div className={styles.timerLabel}>
              {timerMode === "idle" ? "POMODORO TIMER" : timerMode === "focus" ? "▶ FOCUS SESSION" : "☕ BREAK TIME"}
            </div>
            <div className={styles.timerDisplay} data-mode={timerMode}>
              {timerMins}:{timerSecs}
            </div>
            <div className={styles.timerTrack}>
              <div
                className={styles.timerFill}
                style={{
                  width: `${timerProgress * 100}%`,
                  "--timer-color": timerMode === "break" ? "#60a5fa" : "#4ade80",
                }}
              />
            </div>
            <div className={styles.timerBtns}>
              <button
                className={`${styles.timerBtn} ${timerMode !== "idle" ? styles.timerBtnRunning : ""}`}
                onClick={toggleTimer}
                title="タイマー切替 (T)"
              >
                {timerMode === "idle" ? "▶  START" : "■  STOP"}
              </button>
              {timerMode === "focus" && (
                <button
                  className={styles.timerBtn}
                  onClick={() => { setTimerMode("break"); setTimerSeconds(5 * 60); }}
                >
                  → BREAK
                </button>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Current Task */}
          {currentTask ? (
            <div className={styles.focusCard}>
              <div className={styles.focusCardTop}>
                <span className={styles.nowFocusing}>NOW FOCUSING</span>
                {currentTask.priority > 0 && (
                  <span className={styles.focusPriority}>
                    {"★".repeat(Math.min(currentTask.priority, 5))} P{currentTask.priority}
                  </span>
                )}
              </div>

              <h2 className={styles.focusTitle}>{currentTask.title}</h2>

              {currentTask.memo && (
                <p className={styles.focusMemo}>{currentTask.memo}</p>
              )}

              {currentTask.dueDate && (() => {
                const due = formatDate(currentTask.dueDate);
                return due ? (
                  <span className={styles.focusDue} style={{ "--due-color": due.color }}>
                    📅 {due.label}
                  </span>
                ) : null;
              })()}

              <div className={styles.focusActions}>
                {actions.map(({ cls, icon, label, kbd, onClick }) => (
                  <button
                    key={label}
                    className={`${styles.actionBtn} ${styles[cls]}`}
                    onClick={onClick}
                    title={`${label} (${kbd})`}
                  >
                    <span className={styles.actionIcon}>{icon}</span>
                    <span className={styles.actionLabel}>{label}</span>
                    <kbd className={styles.actionKbd}>{kbd}</kbd>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.focusEmpty}>
              <div className={styles.focusEmptyIcon}>🎉</div>
              <div className={styles.focusEmptyLabel}>ALL TASKS COMPLETE</div>
              {snoozedCount > 0 && (
                <div className={styles.focusEmptySub}>💤 {snoozedCount}件が明日まで非表示</div>
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT: Status ── */}
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>PROGRESS</span>
            <span className={styles.progressPct}>{progressPct}%</span>
          </div>
          <div className={styles.progressSection}>
            <div className={styles.statsGrid}>
              {[
                { num: done.length,          label: "DONE",    color: "#4ade80" },
                { num: visibleTodos.length,  label: "QUEUED",  color: "#a78bfa" },
                { num: snoozedCount,         label: "SNOOZED", color: "#60a5fa" },
                { num: trash.length,         label: "TRASH",   color: "#f87171" },
              ].map(({ num, label, color }) => (
                <div key={label} className={styles.statCell}>
                  <span className={styles.statNum} style={{ color }}>{num}</span>
                  <span className={styles.statLabel}>{label}</span>
                </div>
              ))}
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>COMPLETED</span>
            <span className={styles.panelCount}>{done.length}</span>
          </div>
          <div className={styles.completedList}>
            {done.length === 0 ? (
              <div className={styles.emptyMsg}>[ NONE YET ]</div>
            ) : (
              done.slice(0, 10).map((todo) => (
                <div key={todo.id} className={styles.completedRow}>
                  <span className={styles.completedCheck}>✓</span>
                  <span className={styles.completedTitle}>{todo.title}</span>
                  <button
                    className={styles.btnUncomplete}
                    onClick={() => onUncomplete(todo.id)}
                    title="未完了に戻す"
                  >↩</button>
                </div>
              ))
            )}
            {done.length > 10 && (
              <div className={styles.completedMore}>+{done.length - 10} more</div>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>SHORTCUTS</span>
          </div>
          <div className={styles.shortcuts}>
            {[
              ["Space", "完了"],
              ["→",     "後回し"],
              ["↑",     "優先度UP"],
              ["S",     "スヌーズ"],
              ["Del",   "削除"],
              ["E",     "編集"],
              ["T",     "タイマー"],
              ["Ctrl+Z","Undo"],
            ].map(([key, label]) => (
              <div key={key} className={styles.shortcut}>
                <kbd className={styles.kbd}>{key}</kbd>
                <span className={styles.shortcutLabel}>{label}</span>
              </div>
            ))}
          </div>
        </aside>

      </div>
    </div>
  );
}
