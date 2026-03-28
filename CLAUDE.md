# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Swipe Todo** — Tinder-style card-swipe task manager backed by Asana as the database. All infrastructure runs on Cloudflare's free tier.

- `frontend/` — React + Vite (TypeScript/JSX) → deployed to Cloudflare Pages
- `worker/` — Hono API on Cloudflare Workers → proxies all CRUD to the Asana API

There is no traditional database. Asana is the persistence layer. The worker translates between the app's `Todo` shape and Asana tasks, packing `priority` and `snoozedUntil` into the Asana `notes` field using a `\n---\n` separator.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev      # Vite dev server (default port 5173)
npm run build    # TypeScript compile + Vite bundle → dist/
npm run deploy   # build + wrangler pages deploy dist
```

### Worker (`cd worker`)
```bash
npm run dev      # wrangler dev (local Worker at http://localhost:8787)
npm run deploy   # wrangler deploy to Cloudflare
```

### Local development setup
Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8787
```
The Asana token must be set as a Wrangler secret for the worker:
```bash
wrangler secret put ASANA_TOKEN
```
`ASANA_PROJECT_ID` is set in `worker/wrangler.toml` for non-production; override with a secret in production.

## Architecture

### Data flow
```
App.jsx ──(api.ts)──► Worker (Hono) ──► Asana REST API
                       ↑ translates Todo ↔ AsanaTask
```

**`frontend/src/api.ts`** — typed fetch wrapper. `VITE_API_URL` is the base URL; empty string in production (same-origin via Pages proxy or direct Worker URL).

**`worker/src/index.ts`** — single-file Hono app. Key concern: `priority` and `snoozedUntil` are not Asana native fields; they are serialized into `notes` as:
```
<memo text>
---
priority:2
snoozedUntil:2026-03-29
```
`toTodo()` deserializes; `toNotes()` serializes. PATCH always fetches the current task first to merge fields.

**`frontend/src/App.jsx`** — single-file React app. All UI state lives here (`todos`, `done`, `trash`, `history` for undo). The app UI is self-contained with inline styles. `ASANA_INTEGRATION.md` documents the diff patches needed to wire `App.jsx` to `api.ts` (the integration may still be partially in-progress).

### Swipe mechanics
- `SWIPE_THRESHOLD = 80px` — minimum drag to register a swipe
- `< 8px` drag is treated as a tap → opens edit modal
- Direction: horizontal wins if `|dx| > |dy|`; left=complete, right=defer, up=trash (confirm modal), down=priority+1

### Undo
History is a client-side stack of `{ todos, done, trash }` snapshots. Undo restores the previous snapshot but does **not** reverse the Asana API call — the API calls are fire-and-forget.

### Trash
Trash is client-side only. Deleting a task calls `DELETE /api/todos/:id` immediately (removes from Asana). The trash tab shows locally held items that cannot be restored from Asana.
