import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  todayStr,
  tomorrowStr,
  formatDate,
  getDirection,
  SWIPE_THRESHOLD,
} from "./utils.js";

// ── todayStr / tomorrowStr ────────────────────────────────
describe("todayStr", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date with fake timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));
    expect(todayStr()).toBe("2026-03-29");
    vi.useRealTimers();
  });
});

describe("tomorrowStr", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(tomorrowStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is exactly one day after today", () => {
    const today = new Date(todayStr() + "T00:00:00");
    const tomorrow = new Date(tomorrowStr() + "T00:00:00");
    expect(tomorrow - today).toBe(86400000);
  });

  it("returns tomorrow with fake timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));
    expect(tomorrowStr()).toBe("2026-03-30");
    vi.useRealTimers();
  });
});

// ── formatDate ────────────────────────────────────────────
describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null input", () => {
    expect(formatDate(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(formatDate("")).toBeNull();
  });

  it("returns overdue label for past date", () => {
    const result = formatDate("2026-03-28");
    expect(result.label).toBe("1日超過");
    expect(result.color).toBe("#f87171");
  });

  it("returns red color for any overdue date", () => {
    expect(formatDate("2026-01-01").color).toBe("#f87171");
  });

  it("returns 今日まで for today", () => {
    const result = formatDate("2026-03-29");
    expect(result.label).toBe("今日まで");
    expect(result.color).toBe("#fbbf24");
  });

  it("returns 明日まで for tomorrow", () => {
    const result = formatDate("2026-03-30");
    expect(result.label).toBe("明日まで");
    expect(result.color).toBe("#fb923c");
  });

  it("returns N日後 for future dates", () => {
    const result = formatDate("2026-04-05");
    expect(result.label).toBe("7日後");
    expect(result.color).toBe("rgba(255,255,255,0.4)");
  });
});

// ── getDirection ──────────────────────────────────────────
describe("getDirection", () => {
  const T = SWIPE_THRESHOLD;

  it("returns null when both axes are below threshold", () => {
    expect(getDirection(0, 0)).toBeNull();
    expect(getDirection(T - 1, 0)).toBeNull();
    expect(getDirection(0, T - 1)).toBeNull();
    expect(getDirection(T - 1, T - 1)).toBeNull();
  });

  it("returns left for left swipe", () => {
    expect(getDirection(-T, 0)).toBe("left");
    expect(getDirection(-(T + 10), 5)).toBe("left");
  });

  it("returns right for right swipe", () => {
    expect(getDirection(T, 0)).toBe("right");
    expect(getDirection(T + 10, -5)).toBe("right");
  });

  it("returns up for upward swipe", () => {
    expect(getDirection(0, -T)).toBe("up");
    expect(getDirection(5, -(T + 10))).toBe("up");
  });

  it("returns down for downward swipe", () => {
    expect(getDirection(0, T)).toBe("down");
    expect(getDirection(-5, T + 10)).toBe("down");
  });

  it("horizontal wins when |dx| > |dy|", () => {
    expect(getDirection(T + 10, T - 1)).toBe("right");
    expect(getDirection(-(T + 10), -(T - 1))).toBe("left");
  });

  it("vertical wins when |dy| > |dx|", () => {
    expect(getDirection(T - 1, -(T + 10))).toBe("up");
    expect(getDirection(T - 1, T + 10)).toBe("down");
  });

  it("exactly at threshold is a valid swipe", () => {
    expect(getDirection(T, 0)).toBe("right");
    expect(getDirection(-T, 0)).toBe("left");
    expect(getDirection(0, -T)).toBe("up");
    expect(getDirection(0, T)).toBe("down");
  });
});
