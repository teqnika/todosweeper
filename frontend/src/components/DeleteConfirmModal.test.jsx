import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import DeleteConfirmModal from "./DeleteConfirmModal.jsx";

const todo = { id: "1", title: "テストタスク", memo: "メモ内容" };
const todoNoMemo = { id: "2", title: "メモなしタスク", memo: "" };

describe("DeleteConfirmModal", () => {
  it("renders the task title in the preview", () => {
    render(<DeleteConfirmModal todo={todo} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText("テストタスク")).toBeInTheDocument();
  });

  it("renders the task memo when present", () => {
    render(<DeleteConfirmModal todo={todo} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText("メモ内容")).toBeInTheDocument();
  });

  it("does not render memo element when memo is empty", () => {
    render(<DeleteConfirmModal todo={todoNoMemo} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByText("メモ内容")).not.toBeInTheDocument();
  });

  it("calls onCancel when キャンセル is clicked", async () => {
    const onCancel = vi.fn();
    render(<DeleteConfirmModal todo={todo} onCancel={onCancel} onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("キャンセル"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when delete button is clicked", async () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmModal todo={todo} onCancel={() => {}} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText(/ゴミ箱へ移動/));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when the overlay backdrop is clicked", async () => {
    const onCancel = vi.fn();
    const { container } = render(
      <DeleteConfirmModal todo={todo} onCancel={onCancel} onConfirm={() => {}} />
    );
    await userEvent.click(container.firstChild);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does NOT call onCancel when dialog itself is clicked", async () => {
    const onCancel = vi.fn();
    render(<DeleteConfirmModal todo={todo} onCancel={onCancel} onConfirm={() => {}} />);
    // Click inside the dialog (on the title)
    await userEvent.click(screen.getByText("テストタスク"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
