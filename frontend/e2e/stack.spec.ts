import { test, expect } from "./base";

test.describe("スタック画面 — 初期表示", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("ヘッダーに Swipe / Todo が表示される", async ({ page }) => {
    await expect(page.getByText("Swipe")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
  });

  test("タブに初期カウントが表示される（残り 5 / 完了 0）", async ({ page }) => {
    await expect(page.getByRole("button", { name: "残り 5" })).toBeVisible();
    await expect(page.getByRole("button", { name: "完了 0" })).toBeVisible();
  });

  test("先頭カード「デザインレビュー」が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "デザインレビュー" })).toBeVisible();
  });

  test("先頭カードの TODO ラベルが表示される", async ({ page }) => {
    await expect(page.getByText("TODO").first()).toBeVisible();
  });

  test("アクションボタンが 4 つ表示される", async ({ page }) => {
    await expect(page.getByRole("button", { name: /完了/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /削除/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /優先度/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /後回し/ })).toBeVisible();
  });

  test("スヌーズボタンが表示される", async ({ page }) => {
    await expect(page.getByRole("button", { name: /明日まで表示しない/ })).toBeVisible();
  });

  test("Undo ボタンは初期状態で無効", async ({ page }) => {
    await expect(page.getByRole("button", { name: "↩" })).toBeDisabled();
  });

  test("完了タブに切り替えると空状態メッセージが表示される", async ({ page }) => {
    await page.getByRole("button", { name: "完了 0" }).click();
    await expect(page.getByText("まだ完了したタスクはありません")).toBeVisible();
  });
});
