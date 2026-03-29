import { useState } from "react";
import styles from "./BulkAddModal.module.css";

export default function BulkAddModal({ onClose, onAdd }) {
  const [text, setText] = useState("");
  const parsed = text.split("\n").map(l => l.trim()).filter(Boolean);

  function handleAdd() {
    if (!parsed.length) return;
    onAdd(parsed);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.label}>BULK ADD</div>
            <h2 className={styles.title}>一括タスク登録</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.hint}>1行につき1タスクとして登録されます</div>

        <div className={styles.textareaWrapper}>
          <textarea
            autoFocus
            className={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"タスクを1行ずつ入力...\n企画書作成\n議事録まとめ\nSlack確認"}
            rows={8}
          />
          {parsed.length > 0 && (
            <div className={styles.countBadge}>{parsed.length} タスク</div>
          )}
        </div>

        {parsed.length > 0 && (
          <div className={styles.preview}>
            <div className={styles.previewHeading}>PREVIEW</div>
            {parsed.map((line, i) => (
              <div key={i} className={styles.previewRow}>
                <span className={styles.previewIndex}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.previewText}>{line}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>キャンセル</button>
          {parsed.length > 0 ? (
            <button className={styles.addBtn} onClick={handleAdd}>
              {parsed.length}件を登録する
            </button>
          ) : (
            <button className={styles.addBtnDisabled} disabled>
              テキストを入力してください
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
