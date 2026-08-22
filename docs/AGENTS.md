# solyto desktop

<!--
This is your project context, loaded by the agent at the start of every session.
manigot is vendor-agnostic: it runs Claude Code or OpenCode against the same
project (`mg --profile claude-pro` vs `mg --profile zai`/`--profile
opencode-go`/`--profile opencode-zen`), and this one file serves both — manigot mounts it read-only
wherever the selected tool looks for it
(/workspace/AGENTS.md for OpenCode, /workspace/.claude/CLAUDE.md for Claude
Code). Those mount paths are read-only: to change this context, edit this
file (docs/AGENTS.md), never the mount paths.
The same global agents are available under @name either way, and custom
project agents in docs/agents/ work under both tools — write them in the
built-in format (name:, description:, tools: Read, Grep, ...), no per-tool
format needed. To make a custom agent read-only under OpenCode, add a
`permission:` frontmatter block (the built-in format manigot's conversion
passes through to OpenCode's schema — see the manigot README's agent section);
the read-only built-in agents' blocks deny the destructive git commands
(worktree management, branch -d/-D, reset, checkout, push, ...).
Custom agents that must commit (like the built-in developer/reviewer/quality)
declare `commit: true` in their frontmatter; agents that never commit declare
`commit: false` and get a read-only git mount. The default — no agent named,
file missing, or marker absent/unknown — is a writable git mount, so a
committing agent is never broken by a missing marker.
Agent sessions also restrict git to reading history and making commits (the
session git shim): worktree management, branch deletes, resets, checkouts,
pushes, and the other destructive subcommands are refused.
The manigot TUI's job detail view also offers a `t` key that opens the job's
branch diff in tig (`mg diff <job> --tig`) in a tmux split pane / new
terminal, gated on tig being installed on the host.
Copying text from inside a session uses OSC 52: your terminal emulator must
support it, and tmux needs `set-clipboard on` when the session runs inside
tmux (mg forwards your terminal environment into the container and warns at
session start when it detects tmux would swallow the clipboard writes — see
the manigot README's "Clipboard / copying from agent sessions" section).
The `shot` tool (`/usr/local/bin/shot`, see the manigot README's PLAYWRIGHT
doc) renders a URL to a PNG + model-free render report. The developer agent
uses it to verify rendered work; read-only agents consume the artifacts and
never run it.
Keep this file tool-neutral — write it for "the agent", not one vendor.
-->

Electron desktop app for solyto, a private all-in-one personal management app
(todos, notes, calendar, contacts, finances, feeds, time tracking, check-in,
and media libraries). This repo contains the Electron shell plus a vendored
copy of the solyto web frontend, packaged for Linux (AppImage/deb/rpm),
Windows (NSIS), and macOS (DMG), with a Flatpak manifest for Flathub.
AGPL-3.0-only.

## Stack
- Desktop shell: Electron 36 (CommonJS), electron-builder 25, electron-updater 6
- Frontend: vendored SvelteKit 2 / Svelte 5 (runes) SPA — TypeScript, Tailwind
  CSS v4, Vite 7, built to a static SPA (`@sveltejs/adapter-static`, fallback
  `index.html`, no service worker)
- Backend: none in this repo — the app talks to the solyto REST API
  (`https://api.solyto.app` by default; custom API URL per install; dev
  fallback `http://localhost:8000`)
- Database: none in this repo (persistence is server-side)
- Key packages: TipTap 3 (rich-text notes), ECharts 6 (charts),
  marked + DOMPurify, svelte-dnd-action, @simplewebauthn/browser; dev:
  Vitest 4, svelte-check, ESLint 9 + Prettier (tabs, single quotes, no
  trailing commas, width 100)

## Architecture
Two parts: the Electron shell at the repo root and the SPA in `frontend/`.

- `main.js` (main process): frameless window serving `frontend/build` over the
  privileged `app://` protocol with SPA fallback to `index.html`; single
  instance lock; `solyto://` deep links focus the window and open
  `/auth/login`; injects CORS headers for `api.solyto.app`; window controls and
  auto-updater exposed over IPC. Under Flatpak (`FLATPAK_ID` set) the updater
  and protocol-client registration stay dormant.
- `preload.js`: contextIsolation bridge exposing `window.electronAPI` (window
  controls, updater); typed in `patch/app.d.ts`.
- `frontend/` is vendored from the canonical app repo (sibling `../app`) by
  `scripts/vendor.sh`, which also copies the desktop overrides from `patch/`
  over `frontend/svelte.config.js` and `frontend/src/app.d.ts`.
- Frontend layout: `src/routes/` (feature pages per domain), `src/lib/state/`
  (`*.svelte.ts` Svelte 5 runes stores per domain: Todos, Notes, Finances,
  Auth, Theme, ...), `src/lib/services/` (`ApiService` — token-authenticated
  fetch wrapper; endpoints from `config/apiRoutes.ts` with `%s`/`%d` id
  placeholders), `src/lib/helpers/` (pure functions — the unit-tested layer),
  `src/lib/config/` (`platform.ts` detects desktop via `PUBLIC_DESKTOP`,
  resolves the API URL), `src/lib/types/`, `src/lib/i18n/` (de/en/es/fr),
  `src/lib/components/`.
- Desktop frontend build: `scripts/build-frontend.sh` runs `npm ci && npm run
  build` in `frontend/` with `PUBLIC_DESKTOP=true`,
  `PUBLIC_API_URL=https://api.solyto.app`, `PUBLIC_VERSION=<version>`.
- Release: `make release` (reads `VERSION` from untracked `.env`) bumps the
  version, tags, and pushes; the tag triggers `.github/workflows/release.yml`,
  which builds per-OS with electron-builder into a draft GitHub release.
  `flathub/app.solyto.Solyto.yml` builds the same app offline from a git tag.

## Commands
Run in `frontend/`:
- `npm run dev` — Vite dev server on port 5173 (API expected at
  `http://localhost:8000`; no backend exists in this repo)
- `npm run test` — Vitest (`tests/**/*.test.ts`, node env, TZ=UTC)
- `npm run check` — svelte-check; `npm run lint` / `npm run format` —
  Prettier + ESLint
- `npm run build` — static production build (normally done via the scripts
  below so the desktop env vars are set)

Run at the repo root:
- `make build` — full local build: vendor frontend from `../app` (fails if
  that sibling repo is absent; override with `APP_SRC=...`), build it, install
  Electron deps. To work only from this repo: `bash
  scripts/build-frontend.sh && npm install`
- `npm start` (or `make start`) — launch the desktop app (requires an existing
  `frontend/build`)
- `make dist` — electron-builder packaging; `make clean` — remove build output
- `VERSION=x.y.z make release` / `make rerelease` — tag and trigger the
  release workflow (rerelease deletes the existing tag/GitHub release first)

## Hard rules
- NEVER modify files outside /workspace
- NEVER install packages without asking
- NEVER edit generated output (`frontend/build/`, `dist/`, `node_modules/`) —
  regenerate it instead
- NEVER edit `frontend/svelte.config.js` or `frontend/src/app.d.ts` — they are
  overwritten from `patch/` on every vendor run; change them in `patch/`
- `frontend/` is re-synced from the canonical app repo at release time — say so
  before making sweeping frontend changes here
- NEVER push, tag, run `make release`/`rerelease`, or touch/commit `.env`
  without explicit instruction
- When scope is unclear: ask, don't guess
- Do not refactor things unrelated to the current task
- Do not add abstractions not already present in the codebase
- Match the repo format (Prettier: tabs, single quotes, no trailing commas) —
  run `npm run format` in `frontend/` rather than hand-aligning
