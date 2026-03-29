import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ActionButton from "./ActionButton.jsx";

describe("ActionButton", () => {
  it("renders emoji and label", () => {
    render(<ActionButton emoji="✓" label="完了" color="#4ade80" onClick={() => {}} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("完了")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<ActionButton emoji="✓" label="完了" color="#4ade80" onClick={handleClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("applies color as CSS custom property", () => {
    render(<ActionButton emoji="✓" label="完了" color="#4ade80" onClick={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.style.getPropertyValue("--color")).toBe("#4ade80");
  });

  it("renders as a button element", () => {
    render(<ActionButton emoji="🗑️" label="削除" color="#f87171" onClick={() => {}} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
