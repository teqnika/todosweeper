import styles from "./ActionButton.module.css";

export default function ActionButton({ emoji, label, color, onClick }) {
  return (
    <button className={styles.btn} style={{ "--color": color }} onClick={onClick}>
      <span className={styles.emoji}>{emoji}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
