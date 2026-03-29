import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import BulkAddModal from "./BulkAddModal.jsx";

describe("BulkAddModal", () => {
  it("renders textarea with autoFocus and disabled submit button initially", () => {
    render(<BulkAddModal onClose={() => {}} onAdd={() => {}} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("テキストを入力してください")).toBeInTheDocument();
    expect(screen.getByText("テキストを入力してください").closest("button")).toBeDisabled();
  });

  it("shows count badge after entering tasks", () => {
    render(<BulkAddModal onClose={() => {}} onAdd={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "タスクA\nタスクB\nタスクC" },
    });
    expect(screen.getByText("3 タスク")).toBeInTheDocument();
  });

  it("shows preview list of parsed tasks", () => {
    render(<BulkAddModal onClose={() => {}} onAdd={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "タスクA\nタスクB" },
    });
    expect(screen.getByText("タスクA")).toBeInTheDocument();
    expect(screen.getByText("タスクB")).toBeInTheDocument();
  });

  it("shows zero-padded index in preview", () => {
    render(<BulkAddModal onClose={() => {}} onAdd={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "タスクA\nタスクB" },
    });
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("enables submit button and shows count when tasks are entered", () => {
    render(<BulkAddModal onClose={() => {}} onAdd={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "タスクA\nタスクB" },
    });
    expect(screen.getByText("2件を登録する")).toBeInTheDocument();
    expect(screen.getByText("2件を登録する").closest("button")).not.toBeDisabled();
  });

  it("calls onAdd with trimmed non-empty lines and calls onClose", async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<BulkAddModal onClose={onClose} onAdd={onAdd} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "タスクA\n\nタスクB\n  " },
    });
    await userEvent.click(screen.getByText("2件を登録する"));
    expect(onAdd).toHaveBeenCalledWith(["タスクA", "タスクB"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when キャンセル is clicked", async () => {
    const onClose = vi.fn();
    render(<BulkAddModal onClose={onClose} onAdd={() => {}} />);
    await userEvent.click(screen.getByText("キャンセル"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close (✕) button is clicked", async () => {
    const onClose = vi.fn();
    render(<BulkAddModal onClose={onClose} onAdd={() => {}} />);
    await userEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(<BulkAddModal onClose={onClose} onAdd={() => {}} />);
    await userEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when clicking inside the dialog", async () => {
    const onClose = vi.fn();
    render(<BulkAddModal onClose={onClose} onAdd={() => {}} />);
    await userEvent.click(screen.getByText("一括タスク登録"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
