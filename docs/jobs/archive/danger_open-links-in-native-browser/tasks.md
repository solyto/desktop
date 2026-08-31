# Tasks: open links in native browser

id: danger
status: open
analyst: @analyst
date: 2026-08-22

<!-- Produced by @analyst from brief.md. -->

## Analysis summary

Root cause: `main.js` creates the `BrowserWindow` without a
`webContents.setWindowOpenHandler`, so every external link opened via
`target="_blank"` (link library `LinkEntry.svelte`, feeds entries, dashboard
widgets, library `ExternalLink.svelte`, legal links, cookie banner) or
`window.open(..., '_blank')` (todos `Link.svelte`, dev-request screenshots in
`DevRequestEntry.svelte`) falls back to Electron spawning a bare child
`BrowserWindow` — the "minimalistic browser UI" from the brief.

The fix is shell-only: intercept the window-open flow in the main process and
delegate to `shell.openExternal`. This covers every frontend call site
centrally, so `frontend/` (vendored, re-synced from `../app` at release time)
is deliberately NOT modified, and web/mobile behavior is unchanged. The
brief's "can't see downloads" concern resolves implicitly — downloads then
happen in the user's real browser. No new IPC bridge
(`electronAPI.openExternal`) is needed: no frontend caller requires it, and
adding unused IPC surface is out of scope.

## Task breakdown

TASK-1: Redirect popup-style external links to the OS default browser. In
`main.js`, require `shell` and — inside `createWindow()`, so it also covers
the macOS `activate` re-created window — attach
`mainWindow.webContents.setWindowOpenHandler` that (a) always denies
Electron's child window, (b) calls `shell.openExternal(url)` only for an
allowlisted set of schemes (`http:`, `https:`; optionally `mailto:`/`tel:`),
and (c) handles `openExternal`'s promise rejection (log/no-op) so malformed
URLs from semi-trusted content (feed items, user-entered link URLs) can't
produce unhandled rejections. Non-allowlisted schemes are denied without
being passed to `openExternal` (arbitrary schemes can invoke OS protocol
handlers).
files: main.js
depends: none
risk: low — additive change to the shell using one documented Electron API;
no frontend/vendored changes; no existing behavior depends on Electron child
windows (all `window.open` call sites discard the returned window).

TASK-2: Handle top-level `will-navigate` on the main window. Attach
`mainWindow.webContents.on('will-navigate', ...)` in `createWindow()`: allow
same-origin `app://` navigations (the setup page does
`window.location.href = resolve('/auth/login')`), route `mailto:`/`tel:` (and
`http(s):`, if not already consumed by TASK-1's allowlist decision) to
`shell.openExternal`, and keep the window from being navigated away from
`app://`. Explicitly preserve the logout flow: `auth/logout/+page.svelte`
sets `window.location.href = env.PUBLIC_REDIRECT_AFTER_LOGOUT ||
'https://solyto.app'` — proposed behavior is to open that URL in the default
browser while the app window stays on `app://` (consistent with the brief's
intent). Flag the behavior change in implementation.md.
files: main.js
depends: TASK-1 (shares the scheme allowlist)
risk: medium — changes visible behavior beyond the strict brief: the logout
landing-page redirect would open externally instead of replacing the app
window; `mailto:`/`tel:` contact links (currently broken: they attempt an
in-window navigation) start opening in external handlers. Can be dropped
independently if judged out of scope.

TASK-3: Manual verification. `node --check main.js`; ensure `frontend/build`
exists (`bash scripts/build-frontend.sh` if missing, then `npm install` at
root); `npm start`; then verify: (a) a link-library entry, a feed entry, a
todo link, and a dev-request screenshot each open in the OS default browser
with no child Electron window appearing; (b) in-app SPA navigation, deep
link, window controls, and updater UI still work; (c) if TASK-2 was
implemented, a contact `mailto:`/`tel:` link opens the external handler and
logout still ends up somewhere sane.
files: none (verification only)
depends: TASK-1 (and TASK-2 if implemented)
risk: low — read-only verification, but requires a runnable desktop
environment (display + built frontend), which may not be available
headlessly; document what could and could not be verified.

## Out of scope

- Any change under `frontend/` (vendored; fixed centrally via the shell).
- New `preload.js` / `electronAPI` IPC surface.
- In-app downloads or an embedded browser view; Flatpak-specific handling
  (`shell.openExternal` works via the portal/xdg-open as-is).
