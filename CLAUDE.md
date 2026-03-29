# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Swipe Todo** — Tinder風のカードスワイプUIを持つタスク管理アプリ。Asanaをデータベースとして使用し、すべてのインフラはCloudflareの無料プランで動作する。

- `frontend/` — React + Vite (TypeScript/JSX) → Cloudflare Pagesにデプロイ
- `worker/` — Hono API on Cloudflare Workers → 全CRUDをAsana APIにプロキシ

従来のデータベースは存在しない。Asanaが永続化レイヤー。Workerは`Todo`型とAsanaタスクを相互変換し、`priority`と`snoozedUntil`をAsanaの`notes`フィールドに`\n---\n`区切りでシリアライズする。

---

## Directory Structure

```
todosweeper/
├── .devcontainer/
│   └── devcontainer.json        # Node 22 (Bookworm) dev container
├── frontend/
│   ├── index.html               # Vite エントリHTML
│   ├── vite.config.ts           # Vite設定（CSSモジュール camelCase有効）
│   ├── tsconfig.json            # TypeScript設定（React/Vite向け）
│   ├── tsconfig.node.json       # vite.config.ts用TypeScript設定
│   ├── package.json             # React, Vite, TypeScript, wrangler
│   └── src/
│       ├── main.jsx             # Reactエントリポイント（globals.cssをここでimport）
│       ├── globals.css          # グローバルスタイル（@keyframes, box-sizing, フォント）
│       ├── utils.js             # 共有ユーティリティ（todayStr, formatDate, directionConfig等）
│       ├── api.ts               # 型付きAPIクライアント
│       ├── App.jsx              # メインReactアプリ（state・ハンドラのみ）
│       ├── App.module.css       # メイン画面スタイル
│       └── components/
│           ├── ActionButton.jsx / .module.css
│           ├── BulkAddModal.jsx / .module.css
│           ├── DeleteConfirmModal.jsx / .module.css
│           ├── EditModal.jsx / .module.css
│           ├── ListView.jsx / .module.css
│           └── TodoCard.jsx / .module.css
├── worker/
│   ├── package.json             # Hono, @cloudflare/workers-types, wrangler
│   ├── tsconfig.json            # TypeScript設定（Cloudflare Workers向け）
│   ├── wrangler.toml            # Worker設定・ASANA_PROJECT_ID
│   └── src/
│       └── index.ts             # Hono APIサーバー（単一ファイル）
├── ASANA_INTEGRATION.md         # App.jsx → api.ts 統合パッチ手順（12ステップ）
├── CLAUDE.md                    # 本ファイル
└── README.md                    # 機能仕様書（日本語）
```

---

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev          # Vite dev server (デフォルトポート 5173)
npm run build        # TypeScriptコンパイル + Viteバンドル → dist/
npm run deploy       # build + wrangler pages deploy dist
npm run test         # Vitest ユニットテスト（ウォッチモード）
npm run test:run     # Vitest ユニットテスト（一回実行）
npm run test:e2e     # Playwright E2Eテスト
npm run coverage     # カバレッジレポート
```

### Worker (`cd worker`)
```bash
npm run dev      # wrangler dev (ローカルWorker http://localhost:8787)
npm run deploy   # wrangler deploy to Cloudflare
```

### ローカル開発セットアップ

1. `frontend/.env.local` を作成:
```
VITE_API_URL=http://localhost:8787
```

2. AsanaトークンをWranglerシークレットとして設定:
```bash
wrangler secret put ASANA_TOKEN
```

`ASANA_PROJECT_ID`は`worker/wrangler.toml`に設定済み（開発用: `1202804017257914`）。本番環境ではシークレットで上書きすること。

---

## Tech Stack

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| API | Hono 4 on Cloudflare Workers |
| データベース | Asana（永続化レイヤーとして使用） |
| スタイリング | CSSモジュール（`*.module.css`）、CSS変数で動的スタイル |
| 認証 | Asana Bearer トークン |
| デプロイ | Cloudflare Pages + Wrangler CLI |

---

## Architecture

### データフロー
```
App.jsx ──(api.ts)──► Worker (Hono) ──► Asana REST API
                         ↑ Todo ↔ AsanaTask 変換
```

### `frontend/src/api.ts`
型付きfetchラッパー。`VITE_API_URL`をベースURLとする（本番は空文字列＝同一オリジン）。

**エクスポートする型:**
```typescript
type Todo = {
  id: string;           // Asana task gid
  title: string;
  memo: string;
  completed: boolean;
  dueDate: string | null;
  priority: number;
  snoozedUntil: string | null;
};
```

**エクスポートする関数:**
| 関数 | メソッド | パス |
|------|---------|------|
| `fetchTodos()` | GET | `/api/todos` |
| `createTodo(data)` | POST | `/api/todos` |
| `bulkCreateTodos(titles)` | POST | `/api/todos/bulk` |
| `updateTodo(id, data)` | PATCH | `/api/todos/:id` |
| `completeTodo(id, completed)` | PATCH | `/api/todos/:id/complete` |
| `deleteTodo(id)` | DELETE | `/api/todos/:id` |

### `worker/src/index.ts`
単一ファイルのHonoアプリ。全ルートにCORSミドルウェアを適用。

**重要な実装詳細:**
- `priority`と`snoozedUntil`はAsanaネイティブフィールドではないため、`notes`フィールドに以下の形式でシリアライズ:
  ```
  メモ本文
  ---
  priority:2
  snoozedUntil:2026-03-29
  ```
- `toTodo(task)` — Asanaタスク → アプリ形式に変換（`\n---\n`でメモとメタデータを分割）
- `toNotes(memo, priority, snoozedUntil)` — アプリ形式 → Asana notes文字列に変換
- **PATCHは必ず現在のタスクを先にフェッチしてフィールドをマージする**（部分更新のため）

### `frontend/src/utils.js`
共有ユーティリティ。`App.jsx`・各コンポーネント双方からimport。

- `todayStr()` / `tomorrowStr()` — `YYYY-MM-DD`形式の日付文字列
- `formatDate(str)` — 期限日を`{ label, color }`に変換
- `SWIPE_THRESHOLD` — スワイプ判定閾値（80px）
- `directionConfig` — 方向ごとのラベル・カラー定義
- `getDirection(dx, dy)` — ドラッグ量から方向を計算

### `frontend/src/App.jsx`
状態管理とイベントハンドラのみを担う。UIはすべてコンポーネントに委譲。

**主要な状態:**
| state | 説明 |
|-------|------|
| `todos` | アクティブなタスク配列 |
| `done` | 完了済みタスク配列 |
| `trash` | ゴミ箱タスク配列（クライアントサイドのみ） |
| `history` | Undo用スナップショットスタック `{ todos, done, trash }[]` |
| `loading` | Asanaからのデータ取得中フラグ |

**コンポーネント構成（`src/components/`）:**
- `ActionButton` — 汎用アクションボタン
- `BulkAddModal` — 一括タスク作成モーダル
- `DeleteConfirmModal` — タスク削除確認ダイアログ
- `EditModal` — タスクのメモ・期限日編集モーダル
- `ListView` — タスク一覧（All/Active/Done/Trash フィルター付き）
- `TodoCard` — ドラッグ可能なカードコンポーネント（ポインターイベント処理）

**スタイリング:**
- 各コンポーネントは同名の`.module.css`を持つ（例: `TodoCard.module.css`）
- 動的な色値はCSSカスタムプロパティ（`--color`、`--due-color`、`--toast-color`）で渡す
- ドラッグ座標・回転角度など純粋に動的な値のみ`style={{}}`を使用
- ホバー効果はCSSの`:hover`疑似クラスで実装（`onMouseEnter`/`onMouseLeave`不使用）

---

## Swipe Mechanics

- `SWIPE_THRESHOLD = 80px` — スワイプとして認識する最小ドラッグ量
- `< 8px` のドラッグはタップとして扱い → 編集モーダルを開く
- `|dx| > |dy|` なら水平方向優先

| 方向 | アクション | 色 |
|------|---------|-----|
| 左 | 完了 | `#4ade80`（緑） |
| 右 | 後回し（デッキの末尾へ移動） | `#a78bfa`（紫） |
| 上 | 削除確認モーダル表示 | `#f87171`（赤） |
| 下 | 優先度+1 | `#fbbf24`（黄） |

カードは`drag.x * 0.08`ラジアンで回転し、方向に応じたカラーオーバーレイを表示する。

---

## Undo

Undoはクライアントサイドのスタック管理。直前の`{ todos, done, trash }`スナップショットを復元するが、**Asana APIへの操作は元に戻らない**（APIコールはfire-and-forget）。

---

## Trash（ゴミ箱）

ゴミ箱はクライアントサイドのみで管理。タスク削除時に`DELETE /api/todos/:id`が即座に呼ばれ（Asanaから削除）、ローカルの`trash`配列に保持される。ゴミ箱内のタスクはAsanaに存在しないため、**復元はローカル状態への復元のみ**で、Asanaには反映されない。

---

## Asana Integration Status

`ASANA_INTEGRATION.md`に、`App.jsx`と`api.ts`を接続するための12ステップのパッチ手順が記載されている。統合が未完了の場合はこのファイルを参照すること。

**統合の主要ポイント:**
1. `App.jsx`の先頭に`import { fetchTodos, ... } from "./api"` を追加
2. `useState(INITIAL_TODOS)` → `useState([])` に変更し、`loading` stateを追加
3. `useEffect`内でAsanaからタスクを取得して`todos`/`done`に振り分け
4. 各操作（スワイプ、スヌーズ、追加、編集）でAPIを呼び出す
5. ローディング表示を追加

---

## Design Conventions

- **フォント:** Syne（見出し）、DM Sans（本文）、DM Mono（ラベル・コード）
- **カラーパレット:** ダークテーマ（背景 `#1C1C2E`）、グラスモーフィズムエフェクト
- **最大幅:** 480px（モバイルファースト）
- **スタイリング:** CSSモジュール（`*.module.css`）。CSSフレームワーク不使用
- **動的スタイル:** CSSカスタムプロパティ（CSS変数）を使用。`color-mix()`で派生色を生成
- **ホバー効果:** CSSの`:hover`疑似クラスで実装。JSによるスタイル変更は不使用
- **アニメーション:** CSSトランジション（`transition: all 0.2s`）を積極的に使用

---

## Testing

### ユニットテスト（Vitest）
- `frontend/src/**/*.test.{js,jsx,ts,tsx}` — コンポーネント・ユーティリティのユニットテスト
- `worker/src/**/*.test.ts` — Worker APIのユニットテスト（Honoの`app.request()`を使用）
- セットアップ: `frontend/src/test/setup.ts`（`@testing-library/jest-dom`をimport）
- **重要**: `vi.useFakeTimers()`使用中は`userEvent`の代わりに`fireEvent`を使うこと（タイムアウト回避）

### E2Eテスト（Playwright）
- テストファイル: `frontend/e2e/*.spec.ts`
- 設定: `frontend/playwright.config.ts`
- ブラウザ: Chromium（`~/.cache/ms-playwright/chromium-1194/`を使用）
- WebServerオプションでViteを自動起動（ポート 5173）
- **フォント対策**: `e2e/base.ts`でGoogle Fontsへのリクエストをブロック（`load`イベントのタイムアウト防止）
- **root実行時**: `launchOptions: { args: ["--no-sandbox"] }`が必要

| ファイル | 内容 |
|---------|------|
| `e2e/stack.spec.ts` | スタック画面の初期表示（8テスト） |
| `e2e/actions.spec.ts` | アクションボタン（完了・後回し・削除・優先度・スヌーズ）（10テスト） |
| `e2e/add.spec.ts` | タスク追加・一括追加モーダル（10テスト） |
| `e2e/list-view.spec.ts` | 一覧画面（ナビゲーション・フィルター・タスク操作・編集）（14テスト） |

---

## Dev Container

`.devcontainer/devcontainer.json`で設定済み:
- イメージ: Node 22 (Bookworm)
- フォワードポート: `5173`（Vite）、`8787`（Wrangler）
- VSCode拡張: ESLint、Prettier、Cloudflare Workers Bindings
- post-createコマンド: `frontend`と`worker`両方で`npm install`

---

## Key Conventions for AI Assistants

- **新しいDBは作らない**: データ永続化はAsanaのみ。D1/KVなど追加しない
- **Worker単一ファイル原則**: `worker/src/index.ts`は単一ファイルで完結。不必要に分割しない
- **CSSモジュール**: スタイルは`*.module.css`で記述。Tailwindやインラインスタイルは使わない
- **動的色はCSS変数で**: コンポーネントの`style={{ "--foo": value }}`でCSS変数を渡し、CSSで`var(--foo)`を参照する
- **ホバーはCSSで**: `onMouseEnter`/`onMouseLeave`によるインラインスタイル変更は行わない
- **ユーティリティは`utils.js`に**: 日付関数・定数・スワイプ設定は`src/utils.js`から参照する
- **fire-and-forget API**: UIはローカル状態を即時更新し、APIはバックグラウンドで呼ぶ（Undoはローカルのみ）
- **PATCH前のフェッチ**: `updateTodo`は現在値取得→マージ→保存の順序を守る（`worker/src/index.ts`のPATCHルート参照）
- **型安全**: `api.ts`の`Todo`型を変更する場合は`worker/src/index.ts`の`toTodo()`も合わせて更新する
