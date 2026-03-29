import { useState } from "react";
import { formatDate } from "../utils.js";
import EditModal from "./EditModal.jsx";
import DeleteConfirmModal from "./DeleteConfirmModal.jsx";
import styles from "./ListView.module.css";

export default function ListView({ todos, done, trash, onBack, onEdit, onComplete, onDelete, onUncomplete, onRestore, onPermanentDelete }) {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "done" ? done
    : filter === "active" ? todos
    : filter === "trash" ? trash
    : [...todos, ...done];

  const filterOptions = [
    ["all",    `全て ${todos.length + done.length}`],
    ["active", `未完了 ${todos.length}`],
    ["done",   `完了 ${done.length}`],
    ["trash",  `🗑️ ${trash.length}`],
  ];

  function filterBtnClass(key) {
    if (filter !== key) return styles.filterBtn;
    if (key === "trash") return `${styles.filterBtn} ${styles.filterBtnTrashActive}`;
    return `${styles.filterBtn} ${styles.filterBtnActive}`;
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <div>
          <div className={styles.headingLabel}>All Tasks</div>
          <h1 className={styles.heading}>タスク一覧</h1>
        </div>
      </div>

      <div className={styles.filterTabs}>
        {filterOptions.map(([key, label]) => (
          <button key={key} className={filterBtnClass(key)} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {filter === "trash" && trash.length > 0 && (
        <button className={styles.emptyTrashBtn} onClick={() => onPermanentDelete(null)}>
          ゴミ箱を空にする
        </button>
      )}

      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            {filter === "trash" ? "ゴミ箱は空です 🎉" : "タスクがありません"}
          </div>
        )}

        {filtered.map(todo => {
          const isDone = done.some(d => d.id === todo.id);
          const isTrashed = trash.some(t => t.id === todo.id);
          const due = formatDate(todo.dueDate);

          const rowClass = isTrashed ? `${styles.row} ${styles.rowTrashed}`
            : isDone ? `${styles.row} ${styles.rowDone}`
            : styles.row;

          const titleClass = isTrashed ? styles.rowTitleTrashed
            : isDone ? styles.rowTitleDone
            : styles.rowTitle;

          return (
            <div key={todo.id} className={rowClass}>
              <div className={styles.rowInner}>
                <div className={styles.rowContent}>
                  <div className={titleClass}>{todo.title}</div>
                  {todo.memo && <div className={styles.rowMemo}>{todo.memo}</div>}
                  {due && !isDone && !isTrashed && (
                    <div className={styles.dueBadge} style={{ "--due-color": due.color }}>
                      <span className={styles.dueLabel}>⏰ {due.label}</span>
                    </div>
                  )}
                </div>

                <div className={styles.rowActions}>
                  {isTrashed ? (
                    <>
                      <button className={styles.btnRestore} onClick={() => onRestore(todo.id)}>↩ 復元</button>
                      <button className={styles.btnPermanentDelete} onClick={() => onPermanentDelete(todo.id)}>完全削除</button>
                    </>
                  ) : isDone ? (
                    <button className={styles.btnRestore} onClick={() => onUncomplete(todo.id)}>↩ 戻す</button>
                  ) : (
                    <>
                      <button className={styles.btnEdit} onClick={() => setEditTarget(todo)}>編集</button>
                      <button className={styles.btnComplete} onClick={() => onComplete(todo.id)}>✓</button>
                      <button className={styles.btnDelete} onClick={() => setDeleteTarget(todo)}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editTarget && (
        <EditModal
          todo={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(id, updates) => { onEdit(id, updates); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          todo={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}
