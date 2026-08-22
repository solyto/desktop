# Verdict: open links in native browser

id: danger
status: open
reviewer: @reviewer
date: 2026-08-22

<!-- Produced by @reviewer and/or @security after implementation. -->

## Review

Reviewed `git diff main...HEAD` (base `main` per `.manigot/manigot.json`) against
tasks.md. Source changes are confined to `main.js` (+44/-1); independently
re-verified the frontend call-site survey the analysis rests on.

TASK-1: PASS
notes: `shell` added to the electron require (main.js:1);
`EXTERNAL_URL_SCHEMES` allowlist `http:`/`https:`/`mailto:`/`tel:` (main.js:16,
the optional mailto/tel from the spec included); `urlProtocol` try/catch returns
`''` for malformed URLs so they can never pass the allowlist (main.js:18-24);
`setWindowOpenHandler` attached inside `createWindow()` (main.js:86-89), so the
macOS `activate` re-created window is covered too (main.js:165-170 routes through
`createWindow()`); the handler always returns `{ action: 'deny' }` and calls
`openExternal(url)` only for allowlisted schemes; `openExternal` catches and logs
the promise rejection (main.js:30-36), so no unhandled-rejection path. Matches the
task spec point for point. Independently confirmed the survey: `window.open(...,
'_blank')` only in `DevRequestEntry.svelte` and todos `Link.svelte` (both discard
the returned window), `target="_blank"` in 20 components, no `<webview>` usage —
nothing depends on Electron child windows.

TASK-2: PASS
notes: `will-navigate` attached inside `createWindow()` (main.js:95-99). `app:`
protocol navigations allowed — covers the setup page's
`window.location.href = resolve(urls.login)` (`urls.login` is the path
`/auth/login`, so it resolves to `app://localhost/auth/login`), the initial
`loadURL`, and the deep-link `loadURL`. Everything else gets `preventDefault()`
and external-scheme URLs go to `openExternal`; the window can no longer be
navigated off `app://`. Logout behavior change (landing page opens in the default
browser, window stays on `app://`) is exactly what TASK-2 proposed and is flagged
in implementation.md as required. `mailto:`/`tel:` (ContactDetail.svelte, no
`target`, so they flow through will-navigate) route to the external handler.

TASK-3: PARTIAL
notes: Environment-limited, and the task itself anticipated that ("may not be
available headlessly; document what could and could not be verified") — the
developer documented it. Done: `node --check main.js` (claimed; syntax also reads
clean), call-site survey (re-verified independently by this review), and a
mock-electron behavioral smoke test of the real `main.js` covering 17 cases
(script kept outside the repo). Not done: a real `npm start` run — no
`frontend/build`, no root `node_modules`, no display in this environment, and
package installation is not permitted unattended. Not a blocker: the change is
shell-only and statically verified; the outstanding desktop spot-check (four link
types, SPA nav/deep link/window controls/updater, mailto/tel + logout) is already
listed in implementation.md's follow-ups and should be run when a desktop
environment is available.

Commit discipline: TASK-1 and TASK-2 each have their own commit in
`[danger] TASK-N: ...` format; implementation.md has its own commit. The TASK-1
commit additionally contains the analyst's `tasks.md` breakdown and a root
`AGENTS.md` — both pre-existing uncommitted files swept in by the workflow's
`git add -A` and disclosed in implementation.md. `AGENTS.md` is byte-identical to
the already-tracked `docs/AGENTS.md` (verified via `git diff --no-index`), i.e. a
duplicate of the read-only manigot mount; harmless but drift-prone — non-blocking
hygiene note, could be dropped in a follow-up commit.

## Security

@security not run. Reviewer observations: the scheme allowlist is the correct
posture — `file:`, `chrome-extension:`, `solyto:`, `javascript:`, custom
protocols and malformed URLs are denied without ever reaching
`shell.openExternal`, so semi-trusted content (feed items, user-entered link
URLs) cannot invoke arbitrary OS protocol handlers. The change strictly
hardens the shell versus the previous default (bare child BrowserWindow with
no restrictions). No new IPC surface, no renderer exposure.

## Overall

<!-- APPROVED / REJECTED / NEEDS WORK -->

APPROVED

No merge blockers. The implementation matches both tasks exactly, stays in
`main.js` only (no `frontend/`, `preload.js`, or `package.json` changes), and
the one deliberate behavior change (logout landing page opens externally) was
mandated by TASK-2 and flagged as required. Recommended (non-blocking)
follow-ups, already tracked in implementation.md: run the TASK-3 desktop
spot-check on a machine with a display; consider removing the duplicate root
`AGENTS.md` committed with TASK-1.
