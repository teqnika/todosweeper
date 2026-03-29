import styles from "./DeleteConfirmModal.module.css";

export default function DeleteConfirmModal({ todo, onCancel, onConfirm }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.icon}>🗑️</div>

        <div>
          <div className={styles.label}>CONFIRM DELETE</div>
          <h3 className={styles.title}>このタスクを削除しますか？</h3>
          <p className={styles.description}>
            削除したタスクはゴミ箱に移動されます。ゴミ箱から復元することができます。
          </p>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewTitle}>{todo.title}</div>
          {todo.memo && <div className={styles.previewMemo}>{todo.memo}</div>}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.deleteBtn} onClick={onConfirm}>🗑️ ゴミ箱へ移動</button>
        </div>
      </div>
    </div>
  );
}
