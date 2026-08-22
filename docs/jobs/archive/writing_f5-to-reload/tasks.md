# Tasks: f5 to reload

id: writing
status: open
analyst: architect
date: 2026-08-22

## Analysis

Root cause: `createWindow()` in `main.js` calls `Menu.setApplicationMenu(null)`.
Removing the application menu also removes Electron's built-in role accelerators,
including reload. Browsers reload on F5 natively; the Electron shell has no such
handler, so F5 is a no-op in the desktop app.

Chosen approach: intercept F5 in the main process via a
`webContents.on('before-input-event')` listener inside `createWindow()`, calling
`webContents.reload()` + `event.preventDefault()` when F5 is pressed with no
modifiers. Rationale:

- Smallest possible change: one listener in `main.js`. No preload/IPC changes
  (nothing new crosses the contextIsolation bridge), no frontend changes.
- Lives in the desktop wrapper permanently. `frontend/` is vendored and re-synced
  from the canonical app repo (`scripts/vendor.sh`), so a frontend keydown fix
  would be silently reverted at the next vendor run unless upstreamed. Also,
  F5-reload is only missing in the shell — the web app already reloads on F5 via
  the browser — so desktop-only behavior belongs in the wrapper, not in shared
  frontend code.
- `webContents.reload()` performs the same full page reload as the existing
  title-bar reload button (`window.location.reload(true)` in
  `TitleBar.svelte`), so both entry points stay consistent.
- Rejected alternatives:
  (a) `svelte:window onkeydown` in `TitleBar.svelte` — zero wrapper changes but
  sits in vendor-synced code and re-implements a browser behavior for the
  desktop only;
  (b) restoring a (hidden) application menu with a reload role — more invasive
  and platform-divergent (visible menu UI on Win/Linux, and the reload role is
  Cmd+R, not F5, on macOS).

No conflicts: the frontend `KeyManager` (`frontend/src/lib/KeyManager.svelte.ts`)
handles Enter/Escape/Space/e/f/s/n/F1 only; F5 is untouched by it.

## Task breakdown

<!-- TASK-1: description
     files: list of files likely affected
     depends: none
     risk: low / medium / high — reason
-->

TASK-1: Intercept F5 in the main process and trigger a webContents reload
	files: main.js
	depends: none
	risk: low — one isolated listener inside createWindow(); no IPC, preload, or
	frontend changes; gated on exact key 'F5' with no modifiers so it cannot
	swallow Ctrl/Cmd+F5-style combos or ordinary typing.

	Details for the developer:
	- In `createWindow()` (main.js), attach
	  `mainWindow.webContents.on('before-input-event', (event, input) => ...)`.
	- Match `input.type === 'keyDown'` and `input.key === 'F5'` with none of
	  control/alt/meta/shift held; then `event.preventDefault()` and
	  `mainWindow.webContents.reload()`.
	- No new dependencies, no menu changes, no preload/IPC surface.

TASK-2: Manually verify F5 reloads the app in the desktop shell
	files: none (runtime verification only)
	depends: TASK-1
	risk: medium — the workspace currently has no root node_modules, no
	frontend/node_modules, and no frontend/build; verification requires
	installing packages (repo rule: ask first) and a display for Electron.

	Steps:
	- `bash scripts/build-frontend.sh && npm install` (ask before installing).
	- `npm start`, then confirm:
	  1. F5 reloads the SPA (same visible effect as the title-bar reload button);
	  2. the title-bar reload button still works;
	  3. Ctrl+F5 / Shift+F5 are NOT intercepted (modifier check holds);
	  4. ordinary typing and KeyManager shortcuts (e/f/s/n/F1) still work.
	- If no display is available, fall back to code review of the listener and
	  note the limitation in implementation.md.

## Open questions (for the brief author — not blocking TASK-1)

1. Should Cmd/Ctrl+R (and hard reload via `reloadIgnoringCache()`, e.g.
   Ctrl+Shift+R / Ctrl+F5) also work? The brief only asks for F5, so they are
   excluded; they are trivially addable later in the same listener.
2. macOS note: on laptops F5 is a media key by default and users may need
   fn+F5. No code change needed — `before-input-event` reports 'F5' when fn is
   held.
