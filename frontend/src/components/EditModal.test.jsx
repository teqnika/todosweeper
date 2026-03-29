import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import EditModal from "./EditModal.jsx";

const todo = { id: "1", title: "テストタスク", memo: "既存メモ", dueDate: null };
const todoWithDate = { ...todo, dueDate: "2026-03-30" };

describe("EditModal", () => {
  it("renders the task title", () => {
    render(<EditModal todo={todo} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByText("テストタスク")).toBeInTheDocument();
  });

  it("pre-fills existing memo in textarea", () => {
    render(<EditModal todo={todo} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByDisplayValue("既存メモ")).toBeInTheDocument();
  });

  it("pre-fills existing dueDate in date input", () => {
    render(<EditModal todo={todoWithDate} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByDisplayValue("2026-03-30")).toBeInTheDocument();
  });

  it("shows clear button when dueDate is set", () => {
    render(<EditModal todo={todoWithDate} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByText("クリア")).toBeInTheDocument();
  });

  it("does not show clear button when dueDate is null", () => {
    render(<EditModal todo={todo} onClose={() => {}} onSave={() => {}} />);
    expect(screen.queryByText("クリア")).not.toBeInTheDocument();
  });

  it("clears the date when クリア is clicked", async () => {
    render(<EditModal todo={todoWithDate} onClose={() => {}} onSave={() => {}} />);
    await userEvent.click(screen.getByText("クリア"));
    expect(screen.queryByText("クリア")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("2026-03-30")).not.toBeInTheDocument();
  });

  it("calls onSave with updated memo", async () => {
    const onSave = vi.fn();
    render(<EditModal todo={todo} onClose={() => {}} onSave={onSave} />);
    const textarea = screen.getByDisplayValue("既存メモ");
    fireEvent.change(textarea, { target: { value: "新しいメモ" } });
    await userEvent.click(screen.getByText("保存する"));
    expect(onSave).toHaveBeenCalledWith("1", { memo: "新しいメモ", dueDate: null });
  });

  it("calls onSave with dueDate as null when cleared", async () => {
    const onSave = vi.fn();
    render(<EditModal todo={todoWithDate} onClose={() => {}} onSave={onSave} />);
    await userEvent.click(screen.getByText("クリア"));
    await userEvent.click(screen.getByText("保存する"));
    expect(onSave).toHaveBeenCalledWith("1", { memo: "既存メモ", dueDate: null });
  });

  it("calls onSave then onClose on save", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<EditModal todo={todo} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByText("保存する"));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when キャンセル is clicked", async () => {
    const onClose = vi.fn();
    render(<EditModal todo={todo} onClose={onClose} onSave={() => {}} />);
    await userEvent.click(screen.getByText("キャンセル"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <EditModal todo={todo} onClose={onClose} onSave={() => {}} />
    );
    await userEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe("quick date buttons", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("sets dueDate to today when 今日 is clicked", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));
      const onSave = vi.fn();
      render(<EditModal todo={todo} onClose={() => {}} onSave={onSave} />);
      // fireEvent を使うことで fake timer の影響を避ける
      fireEvent.click(screen.getByText("今日"));
      fireEvent.click(screen.getByText("保存する"));
      expect(onSave).toHaveBeenCalledWith("1", { memo: "既存メモ", dueDate: "2026-03-29" });
    });

    it("sets dueDate to tomorrow when 明日 is clicked", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));
      const onSave = vi.fn();
      render(<EditModal todo={todo} onClose={() => {}} onSave={onSave} />);
      fireEvent.click(screen.getByText("明日"));
      fireEvent.click(screen.getByText("保存する"));
      expect(onSave).toHaveBeenCalledWith("1", { memo: "既存メモ", dueDate: "2026-03-30" });
    });
  });
});
