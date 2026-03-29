import { useState } from "react";
import { todayStr, tomorrowStr } from "../utils.js";
import styles from "./EditModal.module.css";

export default function EditModal({ todo, onClose, onSave }) {
  const [memo, setMemo] = useState(todo.memo || "");
  const [dueDate, setDueDate] = useState(todo.dueDate || "");

  function handleSave() {
    onSave(todo.id, { memo, dueDate: dueDate || null });
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.label}>EDIT TASK</div>
            <h3 className={styles.title}>{todo.title}</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>MEMO</label>
          <textarea
            className={styles.textarea}
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={4}
            placeholder="メモを入力..."
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>期限</label>
          <div className={styles.dateRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            {dueDate && (
              <button className={styles.clearBtn} onClick={() => setDueDate("")}>クリア</button>
            )}
          </div>
          <div className={styles.quickDates}>
            {[["今日", todayStr()], ["明日", tomorrowStr()]].map(([label, val]) => (
              <button
                key={label}
                className={dueDate === val ? `${styles.quickDateBtn} ${styles.quickDateBtnActive}` : styles.quickDateBtn}
                onClick={() => setDueDate(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>キャンセル</button>
          <button className={styles.saveBtn} onClick={handleSave}>保存する</button>
        </div>
      </div>
    </div>
  );
}
