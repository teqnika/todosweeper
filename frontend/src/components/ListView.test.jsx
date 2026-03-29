import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ListView from "./ListView.jsx";

const activeTodo = {
  id: "1", title: "アクティブタスク", memo: "メモ", dueDate: null,
  snoozedUntil: null, priority: 0,
};
const doneTodo = {
  id: "2", title: "完了タスク", memo: "", dueDate: null,
  snoozedUntil: null, priority: 0,
};
const trashTodo = {
  id: "3", title: "ゴミ箱タスク", memo: "", dueDate: null,
  snoozedUntil: null, priority: 0, trashedAt: "2026-03-29T00:00:00Z",
};

const baseProps = {
  todos: [activeTodo],
  done: [doneTodo],
  trash: [trashTodo],
  onBack: vi.fn(),
  onEdit: vi.fn(),
  onComplete: vi.fn(),
  onDelete: vi.fn(),
  onUncomplete: vi.fn(),
  onRestore: vi.fn(),
  onPermanentDelete: vi.fn(),
};

describe("ListView — フィルター表示", () => {
  it("全て: active + done を表示し、trash は除外", () => {
    render(<ListView {...baseProps} />);
    expect(screen.getByText("アクティブタスク")).toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
    expect(screen.queryByText("ゴミ箱タスク")).not.toBeInTheDocument();
  });

  it("未完了: active のみ表示", async () => {
    render(<ListView {...baseProps} />);
    await userEvent.click(screen.getByText("未完了 1"));
    expect(screen.getByText("アクティブタスク")).toBeInTheDocument();
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument();
  });

  it("完了: done のみ表示", async () => {
    render(<ListView {...baseProps} />);
    await userEvent.click(screen.getByText("完了 1"));
    expect(screen.queryByText("アクティブタスク")).not.toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
  });

  it("ゴミ箱: trash のみ表示", async () => {
    render(<ListView {...baseProps} />);
    await userEvent.click(screen.getByText("🗑️ 1"));
    expect(screen.getByText("ゴミ箱タスク")).toBeInTheDocument();
    expect(screen.queryByText("アクティブタスク")).not.toBeInTheDocument();
  });
});

describe("ListView — 空状態", () => {
  it("ゴミ箱が空のとき '🎉' メッセージを表示", async () => {
    render(<ListView {...baseProps} trash={[]} />);
    await userEvent.click(screen.getByText("🗑️ 0"));
    expect(screen.getByText(/ゴミ箱は空です/)).toBeInTheDocument();
  });

  it("タスクがゼロのとき 'タスクがありません' を表示", async () => {
    render(<ListView {...baseProps} todos={[]} done={[]} />);
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
  });
});

describe("ListView — ゴミ箱一括削除ボタン", () => {
  it("ゴミ箱フィルター表示中にのみボタンが出る", async () => {
    render(<ListView {...baseProps} />);
    expect(screen.queryByText("ゴミ箱を空にする")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("🗑️ 1"));
    expect(screen.getByText("ゴミ箱を空にする")).toBeInTheDocument();
  });

  it("onPermanentDelete(null) を呼ぶ", async () => {
    const onPermanentDelete = vi.fn();
    render(<ListView {...baseProps} onPermanentDelete={onPermanentDelete} />);
    await userEvent.click(screen.getByText("🗑️ 1"));
    await userEvent.click(screen.getByText("ゴミ箱を空にする"));
    expect(onPermanentDelete).toHaveBeenCalledWith(null);
  });
});

describe("ListView — アクティブタスクのアクション", () => {
  it("✓ ボタンで onComplete を呼ぶ", async () => {
    const onComplete = vi.fn();
    render(<ListView {...baseProps} onComplete={onComplete} />);
    await userEvent.click(screen.getByText("未完了 1"));
    await userEvent.click(screen.getByText("✓"));
    expect(onComplete).toHaveBeenCalledWith("1");
  });

  it("🗑️ ボタン → 確認モーダル → 削除確定で onDelete を呼ぶ", async () => {
    const onDelete = vi.fn();
    render(<ListView {...baseProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByText("未完了 1"));
    await userEvent.click(screen.getByText("🗑️"));
    expect(screen.getByText("このタスクを削除しますか？")).toBeInTheDocument();
    await userEvent.click(screen.getByText(/ゴミ箱へ移動/));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("削除モーダルでキャンセルすると onDelete は呼ばれない", async () => {
    const onDelete = vi.fn();
    render(<ListView {...baseProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByText("未完了 1"));
    await userEvent.click(screen.getByText("🗑️"));
    await userEvent.click(screen.getByText("キャンセル"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("編集ボタンで EditModal が開く", async () => {
    render(<ListView {...baseProps} />);
    await userEvent.click(screen.getByText("未完了 1"));
    await userEvent.click(screen.getByText("編集"));
    expect(screen.getByText("EDIT TASK")).toBeInTheDocument();
  });
});

describe("ListView — 完了タスクのアクション", () => {
  it("↩ 戻す ボタンで onUncomplete を呼ぶ", async () => {
    const onUncomplete = vi.fn();
    render(<ListView {...baseProps} onUncomplete={onUncomplete} />);
    await userEvent.click(screen.getByText("完了 1"));
    await userEvent.click(screen.getByText("↩ 戻す"));
    expect(onUncomplete).toHaveBeenCalledWith("2");
  });
});

describe("ListView — ゴミ箱タスクのアクション", () => {
  it("↩ 復元 ボタンで onRestore を呼ぶ", async () => {
    const onRestore = vi.fn();
    render(<ListView {...baseProps} onRestore={onRestore} />);
    await userEvent.click(screen.getByText("🗑️ 1"));
    await userEvent.click(screen.getByText("↩ 復元"));
    expect(onRestore).toHaveBeenCalledWith("3");
  });

  it("完全削除ボタンで onPermanentDelete(id) を呼ぶ", async () => {
    const onPermanentDelete = vi.fn();
    render(<ListView {...baseProps} onPermanentDelete={onPermanentDelete} />);
    await userEvent.click(screen.getByText("🗑️ 1"));
    await userEvent.click(screen.getByText("完全削除"));
    expect(onPermanentDelete).toHaveBeenCalledWith("3");
  });
});

describe("ListView — ナビゲーション", () => {
  it("← ボタンで onBack を呼ぶ", async () => {
    const onBack = vi.fn();
    render(<ListView {...baseProps} onBack={onBack} />);
    await userEvent.click(screen.getByText("←"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("フィルタータブのカウント表示が正しい", () => {
    render(<ListView {...baseProps} />);
    expect(screen.getByText("全て 2")).toBeInTheDocument();
    expect(screen.getByText("未完了 1")).toBeInTheDocument();
    expect(screen.getByText("完了 1")).toBeInTheDocument();
    expect(screen.getByText("🗑️ 1")).toBeInTheDocument();
  });
});
