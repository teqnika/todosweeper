import { test, expect } from "./base";

test.describe("タスク追加モーダル", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("+ ボタンでモーダルが開く", async ({ page }) => {
    await page.getByRole("button", { name: "+", exact: true }).click();
    await expect(page.getByText("新しいTodo")).toBeVisible();
    await expect(page.getByPlaceholder("タイトル")).toBeVisible();
    await expect(page.getByPlaceholder("メモ（任意）")).toBeVisible();
  });

  test("オーバーレイクリックでモーダルが閉じる", async ({ page }) => {
    await page.getByRole("button", { name: "+", exact: true }).click();
    // モーダルの外側（オーバーレイ）をクリック
    await page.mouse.click(10, 10);
    await expect(page.getByText("新しいTodo")).not.toBeVisible();
  });

  test("タイトル入力して追加するとスタックに追加される", async ({ page }) => {
    await page.getByRole("button", { name: "+", exact: true }).click();
    await page.getByPlaceholder("タイトル").fill("新しいタスク");
    await page.getByRole("button", { name: "追加する" }).click();
    await expect(page.getByRole("button", { name: "残り 6" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "新しいタスク" })).toBeVisible();
  });

  test("Enter キーでタスクを追加できる", async ({ page }) => {
    await page.getByRole("button", { name: "+", exact: true }).click();
    await page.getByPlaceholder("タイトル").fill("Enterで追加");
    await page.getByPlaceholder("タイトル").press("Enter");
    await expect(page.getByRole("button", { name: "残り 6" })).toBeVisible();
  });

  test("タイトル空のときは追加されない", async ({ page }) => {
    await page.getByRole("button", { name: "+", exact: true }).click();
    await page.getByRole("button", { name: "追加する" }).click();
    await expect(page.getByRole("button", { name: "残り 5" })).toBeVisible();
  });
});

test.describe("一括追加モーダル", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("≡+ ボタンで一括追加モーダルが開く", async ({ page }) => {
    await page.getByRole("button", { name: "≡+" }).click();
    await expect(page.getByText("一括タスク登録")).toBeVisible();
    await expect(page.getByRole("textbox")).toBeVisible();
  });

  test("初期状態では登録ボタンが無効", async ({ page }) => {
    await page.getByRole("button", { name: "≡+" }).click();
    await expect(page.getByRole("button", { name: "テキストを入力してください" })).toBeDisabled();
  });

  test("テキスト入力でプレビューとカウントバッジが表示される", async ({ page }) => {
    await page.getByRole("button", { name: "≡+" }).click();
    await page.getByRole("textbox").fill("タスクA\nタスクB\nタスクC");
    await expect(page.getByText("3 タスク")).toBeVisible();
    await expect(page.getByText("タスクA").nth(1)).toBeVisible();
    await expect(page.getByText("タスクB").nth(1)).toBeVisible();
  });

  test("複数タスクを一括登録するとスタックに追加される", async ({ page }) => {
    await page.getByRole("button", { name: "≡+" }).click();
    await page.getByRole("textbox").fill("一括タスク1\n一括タスク2\n一括タスク3");
    await page.getByRole("button", { name: "3件を登録する" }).click();
    await expect(page.getByRole("button", { name: "残り 8" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "一括タスク1" })).toBeVisible();
  });

  test("キャンセルでモーダルが閉じる", async ({ page }) => {
    await page.getByRole("button", { name: "≡+" }).click();
    await page.getByRole("button", { name: "キャンセル" }).click();
    await expect(page.getByText("一括タスク登録")).not.toBeVisible();
  });
});
