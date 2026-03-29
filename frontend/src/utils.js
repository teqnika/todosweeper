export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function formatDate(str) {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  const diff = Math.ceil((d - new Date(todayStr() + "T00:00:00")) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, color: "#f87171" };
  if (diff === 0) return { label: "今日まで", color: "#fbbf24" };
  if (diff === 1) return { label: "明日まで", color: "#fb923c" };
  return { label: `${diff}日後`, color: "rgba(255,255,255,0.4)" };
}

export const SWIPE_THRESHOLD = 80;

export const directionConfig = {
  right: { label: "後回し",   color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  left:  { label: "完了",     color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  up:    { label: "削除",     color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  down:  { label: "優先度UP", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
};

export function getDirection(dx, dy) {
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy < 0 ? "up" : "down";
}
