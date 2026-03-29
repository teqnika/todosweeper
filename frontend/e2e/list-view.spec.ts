import { test, expect } from "./base";

test.describe("一覧画面 — ナビゲーション", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("☰ ボタンで一覧画面に遷移する", async ({ page }) => {
    await page.getByRole("button", { name: "☰" }).click();
    await expect(page.getByRole("heading", { name: "タスク一覧" })).toBeVisible();
  });

  test("← ボタンでメイン画面に戻る", async ({ page }) => {
    await page.getByRole("button", { name: "☰" }).click();
    await page.getByRole("button", { name: "←" }).click();
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
  });
});

test.describe("一覧画面 — フィルター", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "☰" }).click();
  });

  test("デフォルトで全タスクが表示される（全て 5）", async ({ page }) => {
    await expect(page.getByText("全て 5")).toBeVisible();
    await expect(page.getByText("デザインレビュー")).toBeVisible();
    await expect(page.getByText("Cloudflare Workers設定")).toBeVisible();
  });

  test("「未完了」フィルターでアクティブタスクのみ表示", async ({ page }) => {
    await page.getByRole("button", { name: /未完了/ }).click();
    await expect(page.getByText("デザインレビュー")).toBeVisible();
  });

  test("「完了」フィルターで初期は空状態", async ({ page }) => {
    await page.getByRole("button", { name: /^完了 0/ }).click();
    await expect(page.getByText("タスクがありません")).toBeVisible();
  });

  test("「🗑️」フィルターで初期は空状態", async ({ page }) => {
    await page.getByRole("button", { name: /🗑️ 0/ }).click();
    await expect(page.getByText("ゴミ箱は空です")).toBeVisible();
  });
});

test.describe("一覧画面 — タスク操作", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "☰" }).click();
  });

  test("✓ ボタンでタスクを完了にできる", async ({ page }) => {
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "✓" }).first().click();
    // 未完了タブのカウントが減る
    await expect(page.getByText("未完了 4")).toBeVisible();
    // 完了タブで確認
    await page.getByRole("button", { name: /^完了 1/ }).click();
    await expect(page.getByText("デザインレビュー")).toBeVisible();
  });

  test("完了済みタスクを「↩ 戻す」で未完了に戻せる", async ({ page }) => {
    // まず1件完了にする
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "✓" }).first().click();
    // 完了タブで戻す
    await page.getByRole("button", { name: /^完了 1/ }).click();
    await page.getByRole("button", { name: "↩ 戻す" }).click();
    await expect(page.getByText("未完了 5")).toBeVisible();
  });

  test("🗑️ → 確認 → ゴミ箱へ移動", async ({ page }) => {
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "🗑️", exact: true }).first().click();
    await expect(page.getByText("このタスクを削除しますか？")).toBeVisible();
    await page.getByRole("button", { name: /ゴミ箱へ移動/ }).click();
    await expect(page.getByText("未完了 4")).toBeVisible();
  });

  test("ゴミ箱から「↩ 復元」できる", async ({ page }) => {
    // 1件ゴミ箱へ
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "🗑️", exact: true }).first().click();
    await page.getByRole("button", { name: /ゴミ箱へ移動/ }).click();
    // ゴミ箱フィルターで復元
    await page.getByRole("button", { name: /🗑️ 1/ }).click();
    await page.getByRole("button", { name: "↩ 復元" }).click();
    await expect(page.getByText("未完了 5")).toBeVisible();
  });

  test("ゴミ箱から「完全削除」できる", async ({ page }) => {
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "🗑️", exact: true }).first().click();
    await page.getByRole("button", { name: /ゴミ箱へ移動/ }).click();
    await page.getByRole("button", { name: /🗑️ 1/ }).click();
    await page.getByRole("button", { name: "完全削除" }).click();
    await expect(page.getByText("ゴミ箱は空です")).toBeVisible();
  });

  test("「ゴミ箱を空にする」で一括削除できる", async ({ page }) => {
    // 2件ゴミ箱へ
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "🗑️", exact: true }).first().click();
    await page.getByRole("button", { name: /ゴミ箱へ移動/ }).click();
    await page.getByRole("button", { name: /未完了/ }).click();
    await page.getByRole("button", { name: "🗑️", exact: true }).first().click();
    await page.getByRole("button", { name: /ゴミ箱へ移動/ }).click();
    // ゴミ箱を空にする
    await page.getByRole("button", { name: /🗑️ 2/ }).click();
    await page.getByRole("button", { name: "ゴミ箱を空にする" }).click();
    await expect(page.getByText("ゴミ箱は空です")).toBeVisible();
  });
});

test.describe("一覧画面 — 編集モーダル", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "☰" }).click();
    await page.getByRole("button", { name: /未完了/ }).click();
  });

  test("「編集」ボタンで EditModal が開く", async ({ page }) => {
    await page.getByRole("button", { name: "編集" }).first().click();
    await expect(page.getByText("EDIT TASK")).toBeVisible();
    await expect(page.getByRole("heading", { name: "デザインレビュー" })).toBeVisible();
  });

  test("メモを編集して保存できる", async ({ page }) => {
    await page.getByRole("button", { name: "編集" }).first().click();
    const textarea = page.getByPlaceholder("メモを入力...");
    await textarea.clear();
    await textarea.fill("更新したメモ");
    await page.getByRole("button", { name: "保存する" }).click();
    await expect(page.getByText("EDIT TASK")).not.toBeVisible();
  });
});
