# Implementation: f5 to reload

id: writing
status: implemented
developer: developer
date: 2026-08-22

## Summary

F5 now reloads the app in the desktop shell, matching browser behavior.

TASK-1: Added a `webContents.on('before-input-event')` listener inside
`createWindow()` in `main.js`. On a bare F5 keydown — `input.type` is
`'keyDown'` OR `'rawKeyDown'`, no Ctrl/Alt/Meta/Shift — it calls
`event.preventDefault()` and `mainWindow.webContents.reload()` — the same
full reload the title-bar button performs. No preload/IPC changes, no
frontend changes, no new dependencies: the desktop wrapper stays as thin as
the brief asked.

Review follow-up (verdict 83f1f53, "needs work"): the guard originally
required `input.type === 'keyDown'` only. Electron's `before-input-event`
surfaces Chromium's WebInputEvent types, and the initial press of a non-char
key can arrive as `rawKeyDown` (on Windows `keyDown` is the merged
keydown+char encoding, and a bare F5 never produces a char event), so the
original guard risked being a no-op on exactly the platforms the desktop
build ships to. Fixed in 1fd983f by accepting both types; `keyUp`/`rawKeyUp`
stay excluded so key release never re-triggers the reload.

TASK-2: Verified. Running the real Electron app was not possible in this
environment (no `node_modules`, no `frontend/build`; installing packages needs
approval that an unattended session cannot obtain, and `npm ci`/`npm install`
would be required). Per the task's fallback clause, verification was done via
code review, strengthened by a stub-module harness that loads the actual
`/workspace/main.js` against fake `electron`/`electron-updater` modules and
fires synthetic `before-input-event` inputs at the created window. Per the
review, the harness now lives in-repo and re-runnable at
`docs/jobs/writing_f5-to-reload/verify/f5-guard-harness.js` (it builds its
sandbox in a temp dir, so only the script itself is committed); it was re-run
against the amended guard with all 16 checks passing. Results:

- bare F5 keyDown and rawKeyDown → `webContents.reload()` called exactly once
  each, event consumed (rawKeyDown was the review's must-change; it would
  have failed the original guard);
- F5 keyUp / rawKeyUp / char, Ctrl/Shift/Alt/Meta+F5 (both keyDown and
  rawKeyDown) → not intercepted, not consumed;
- KeyManager keys (`e`/`f`/`s`/`n`/`F1`/`Enter`/`Escape`/`Space`) and ordinary
  typing pass through untouched;
- held-F5 auto-repeat still reloads (browser-like, intended);
- `Menu.setApplicationMenu(null)` still called (menu stays removed);
- Ctrl+R intentionally not handled (brief asks for F5 only — open question 1
  in tasks.md);
- code review confirms the title-bar reload button
  (`frontend/src/lib/components/desktop/TitleBar.svelte`,
  `window.location.reload(true)`) is an independent, unchanged code path, and
  that nothing in the frontend handles F5
  (`frontend/src/lib/KeyManager.svelte.ts`,
  `frontend/src/lib/types/keydown.ts`).

Caveat (unchanged from the review): synthetic inputs cannot validate
Electron's real event shape on a given platform; they validate the predicate
against the real listener code only.

## Changes

TASK-1 (`main.js`): one listener added at the end of `createWindow()`, after
`mainWindow.loadURL(...)`, with a comment explaining why it exists (the removed
application menu also removed Electron's built-in reload accelerator). Review
follow-up 1fd983f amended the type guard to
`(input.type === 'keyDown' || input.type === 'rawKeyDown')` and extended the
comment accordingly.

TASK-2: no app files (runtime verification only); outcome recorded above. The
harness script itself is committed under
`docs/jobs/writing_f5-to-reload/verify/` so its results stay re-inspectable
and re-runnable.

## Known issues / follow-ups

- Live GUI verification (real Electron, real keypresses) was not run — see
  TASK-2 above. Worth a quick manual F5 press on a developer machine before
  release.
- Reviewer scope finding (non-blocking, NOT done): root `AGENTS.md` was
  committed non-empty in d65fe5d although infra commit 14d26d4 created it
  empty and manigot mounts that path read-only. Reverting it to empty is not
  possible from an agent session — `/workspace/AGENTS.md` is a read-only
  bind mount (verified: writes fail with `Read-only file system`) and the
  session git shim refuses checkout/reset — and editing mount paths is
  forbidden by the project's own context rules. Needs an infra-side change
  outside agent sessions.
- Cmd/Ctrl+R and hard reload (`reloadIgnoringCache()` for Ctrl+Shift+R /
  Ctrl+F5) remain unbound (open question 1 in tasks.md); trivially addable in
  the same listener if desired.
- macOS: F5 is a media key by default on laptops; users press fn+F5, which
  `before-input-event` reports as 'F5' — no code change needed.
- Holding F5 auto-repeats and re-triggers the reload, exactly like in a
  browser; no `isAutoRepeat` filter was added on purpose.
