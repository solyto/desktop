# Verdict: f5 to reload

id: writing
status: reviewed
reviewer: reviewer
date: 2026-08-22

## Review (round 2 — re-review after 1fd983f / af55411)

Previous verdict (83f1f53, NEEDS WORK) required one change: accept
`rawKeyDown` alongside `keyDown` in the F5 guard, and record the amended
guard in implementation.md. Both are done; re-reviewed the full branch diff
(main...HEAD) against tasks.md.

TASK-1: PASS
notes: main.js:67-79 — the guard now reads
`(input.type === 'keyDown' || input.type === 'rawKeyDown') && input.key ===
'F5'` with all four modifiers required unset, then `event.preventDefault()` +
`mainWindow.webContents.reload()`. This is the previous verdict's must-change,
applied exactly (1fd983f), with the explanatory comment extended to match
(main.js:61-66). Verified against the analyst spec: listener inside
`createWindow()` after `loadURL`, so it also re-attaches on the macOS
`activate` re-create path; `keyUp`/`rawKeyUp`/`char` excluded; modifier
combos pass through; Menu.setApplicationMenu(null) untouched; no preload,
IPC, menu, or frontend changes (branch diff touches only main.js + docs).
Code style matches the surrounding main.js. No remaining correctness issue:
even in the hypothetical where a single press surfaced as both rawKeyDown and
keyDown, the second reload() is benign.

TASK-2: PASS
notes: Fallback path, as permitted by the task when no display/installs are
available. This round addressed the previous verdict's re-inspectability
complaint: the harness is now committed at
docs/jobs/writing_f5-to-reload/verify/f5-guard-harness.js and implementation.md
records the amended guard and the 16-check re-run. Reviewed the harness line
by line: MAIN_JS resolves 4 dirs up from verify/ to /workspace/main.js (the
real file, copied into a temp sandbox with stub electron/electron-updater
modules); the stubs cover every API main.js touches at require/whenReady
time (app, BrowserWindow, protocol, net, session, Menu, ipcMain,
autoUpdater); the 15 input cases + menu check match the claimed 16 results
and their expectations match the guard's semantics (bare F5 keyDown and
rawKeyDown intercept; keyUp/rawKeyUp/char, all four modifier combos, Ctrl+R,
and KeyManager keys pass through; auto-repeat still reloads). I could not
re-execute it myself — this session's shell is restricted to whitelisted git
commands — but static review found no flaw in the harness logic, and its
limitation (synthetic inputs cannot validate Electron's real per-platform
event shape) is honestly stated in both the harness header and
implementation.md. Frontend claims re-verified by inspection: the title-bar
reload button (TitleBar.svelte:21, `window.location.reload(true)`) is an
independent unchanged path, and nothing in frontend/src handles F5
(KeyManager covers Enter/Escape/Space/e/f/s/n/F1 only; the only 'F5' grep
hits are hex-color substrings in class names).

Commit discipline: TASK-1 has its own commit (19a2fdf); the review fix
(1fd983f) and the implementation update + harness (af55411) are properly
separated. TASK-2 and the original implementation.md share 2c5cb25 — the
cosmetic nit already noted in the previous verdict; not re-offended this
round, not a blocker.

Scope: the branch diff is exactly main.js + docs/jobs/** + the AGENTS.md
content from d65fe5d. The AGENTS.md situation is unchanged from the previous
review (non-blocking; byte-identical to docs/AGENTS.md; implementation.md
documents why it cannot be reverted from an agent session — read-only bind
mount). The committed harness was explicitly requested by the previous
verdict ("keep such scaffolding under docs/jobs/"), so it is in scope.

## Security

none — not run. Unchanged assessment: one main-process input filter, no new
IPC/preload/remote-content surface; it only calls preventDefault() and
webContents.reload().

## Overall

APPROVED

Must change before merge: nothing. The single must-change from the previous
verdict is implemented and verified.

Recommended (non-blocking, not gating merge): a quick manual F5 press in the
real desktop app on a developer machine before release — already recorded
under implementation.md known issues; synthetic-input testing cannot fully
substitute for a real keypress.
