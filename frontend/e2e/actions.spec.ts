import { test, expect } from "./base";

test.describe("アクションボタン — 完了", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("完了ボタンでカードが消えタブカウントが減る", async ({ page }) => {
    await page.getByRole("button", { name: /✓.*完了/ }).click();
    await expect(page.getByRole("button", { name: "残り 4" })).toBeVisible();
    await expect(page.getByRole("button", { name: "完了 1" })).toBeVisible();
  });

  test("完了後に Undo ボタンが有効になる", async ({ page }) => {
    await page.getByRole("button", { name: /✓.*完了/ }).click();
    await expect(page.getByRole("button", { name: "↩" })).toBeEnabled();
  });

  test("Undo で元の状態に戻る", async ({ page }) => {
    await page.getByRole("button", { name: /✓.*完了/ }).click();
    await page.getByRole("button", { name: "↩" }).click();
    await expect(page.getByRole("button", { name: "残り 5" })).toBeVisible();
    await expect(page.getByRole("button", { name: "完了 0" })).toBeVisible();
  });

  test("完了タブに完了したタスクが表示される", async ({ page }) => {
    await page.getByRole("button", { name: /✓.*完了/ }).click();
    await page.getByRole("button", { name: "完了 1" }).click();
    await expect(page.getByText("デザインレビュー").first()).toBeVisible();
  });
});

test.describe("アクションボタン — 後回し", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("後回しでカードが入れ替わり残り数は変わらない", async ({ page }) => {
    await page.getByRole("button", { name: /→.*後回し/ }).click();
    await expect(page.getByRole("button", { name: "残り 5" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cloudflare Workers設定" })).toBeVisible();
  });
});

test.describe("アクションボタン — 削除", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("削除ボタンで確認モーダルが開く", async ({ page }) => {
    await page.getByRole("button", { name: /🗑️.*削除/ }).click();
    await expect(page.getByText("このタスクを削除しますか？")).toBeVisible();
    await expect(page.getByText("デザインレビュー").first()).toBeVisible();
  });

  test("削除キャンセルでモーダルが閉じカード数は変わらない", async ({ page }) => {
    await page.getByRole("button", { name: /🗑️.*削除/ }).click();
    await page.getByRole("button", { name: "キャンセル" }).click();
    await expect(page.getByText("このタスクを削除しますか？")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "残り 5" })).toBeVisible();
  });

  test("削除確定でカードが減りゴミ箱に入る", async ({ page }) => {
    await page.getByRole("button", { name: /🗑️.*削除/ }).click();
    await page.getByRole("button", { name: /ゴミ箱へ移動/ }).click();
    await expect(page.getByRole("button", { name: "残り 4" })).toBeVisible();
  });
});

test.describe("アクションボタン — 優先度", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("優先度ボタンで次のカードに切り替わる", async ({ page }) => {
    await page.getByRole("button", { name: /★.*優先度/ }).click();
    await expect(page.getByRole("heading", { name: "Cloudflare Workers設定" })).toBeVisible();
  });
});

test.describe("スヌーズ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("スヌーズで先頭カードが非表示になり残り数が減る", async ({ page }) => {
    await page.getByRole("button", { name: /明日まで表示しない/ }).click();
    await expect(page.getByRole("button", { name: "残り 4" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cloudflare Workers設定" })).toBeVisible();
  });
});
