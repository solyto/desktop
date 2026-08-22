# Implementation: open links in native browser

Job: `danger_open-links-in-native-browser` · branch: `feature/danger_open-links-in-native-browser`

## Summary

Links that leave the solyto desktop app now open in the user's OS default
browser instead of a bare Electron child window. The fix is entirely in the
Electron shell (`main.js`): `webContents.setWindowOpenHandler` intercepts all
popup-style opens (`target="_blank"`, `window.open(..., '_blank')`) and
`will-navigate` intercepts top-level navigations; both deny in-app handling
for anything not on `app://` and delegate `http:`/`https:`/`mailto:`/`tel:`
URLs to `shell.openExternal`. No `frontend/` (vendored) changes, no new IPC
surface. Downloads triggered by such links consequently happen in the real
browser, resolving the brief's core complaint.

## Changes

TASK-1 — popup-style links to the default browser:
- `main.js`: added `shell` to the electron require; added the shared
  `EXTERNAL_URL_SCHEMES` allowlist (`http:`, `https:`, `mailto:`, `tel:`) plus
  `urlProtocol`/`isExternalUrl`/`openExternal` helpers (`openExternal` logs and
  swallows rejections so malformed URLs can't cause unhandled rejections).
  Inside `createWindow()` (so the macOS `activate` re-created window is covered
  too): `mainWindow.webContents.setWindowOpenHandler` always returns
  `{ action: 'deny' }` and calls `shell.openExternal(url)` only for allowlisted
  schemes — non-allowlisted schemes (`file:`, `solyto:`, `javascript:`,
  custom protocols, malformed URLs) are denied without reaching
  `openExternal`, so they cannot invoke arbitrary OS protocol handlers.
- This centrally covers all frontend call sites: link library
  `LinkEntry.svelte`, feed entries, dashboard widgets, `ExternalLink.svelte`,
  legal links, cookie banner (`target="_blank"`) and todos `Link.svelte` /
  dev-request screenshots (`window.open`).

TASK-2 — top-level `will-navigate` handling:
- `main.js`: inside `createWindow()`,
  `mainWindow.webContents.on('will-navigate', ...)`: navigations whose URL
  protocol is `app:` are allowed (setup page's
  `window.location.href = resolve('/auth/login')`, SPA routes); everything
  else gets `event.preventDefault()` and, if allowlisted, `shell.openExternal`.
  The window can therefore never be navigated away from `app://`.
- **Behavior changes beyond the strict brief (flagged as required):**
  - Logout (`auth/logout/+page.svelte` sets
    `window.location.href = env.PUBLIC_REDIRECT_AFTER_LOGOUT || landingPage`,
    i.e. `https://solyto.app` by default) now opens the landing page in the
    default browser while the app window stays on `app://` (previously the
    frameless app window navigated to the website). The user is still logged
    out; only the "landing" destination moved to an external browser tab.
  - Contact `mailto:`/`tel:` links (previously broken in-window navigation
    attempts) now open the OS external handlers.

TASK-3 — verification (files: none, so nothing to commit for this task):
- `node --check main.js` — passes (after TASK-1 and again after TASK-2).
- Frontend call-site survey confirmed the analysis: `window.open(...,
  '_blank')` only in `DevRequestEntry.svelte` and todos `Link.svelte`;
  `mailto:`/`tel:` only in `ContactDetail.svelte`; `window.location.href`
  assignments only in `setup/+page.svelte` (app-internal) and
  `auth/logout/+page.svelte` (external).
- Behavioral smoke test of the real `main.js` with mocked
  `electron`/`electron-updater` modules (script kept outside the repo in
  `/tmp/solyto-smoke/`): 9 window-open cases (child window always denied;
  `http`/`https`/`mailto`/`tel` → `openExternal`; `file:`, `solyto://`,
  `javascript:`, `about:`, malformed → denied without opening) and 8
  will-navigate cases (`app://` allowed un-prevented; external `http(s)`/
  `mailto:`/`tel:` prevented + opened; `file:`/`chrome-extension:` prevented,
  not opened) all pass; a simulated `openExternal` rejection is caught, logged
  and does not become an unhandled rejection. All handlers attach inside
  `createWindow()`, so the macOS `activate` path is covered by construction.
- **Could not be verified here:** a real `npm start` run — `frontend/build`
  and root `node_modules` don't exist in this environment, no display is
  present, and building/installing packages is not permitted without asking
  (unattended session). So real OS-level default-browser opening (xdg-open /
  Flatpak portal), updater UI, window controls, deep links and in-app SPA
  navigation after the change remain to be spot-checked on a desktop
  machine. The `shot` render tool is inapplicable (Electron shell, no URL to
  render, and no UI markup changed).

## Known issues / follow-ups

- The logout landing-page redirect now opens an external browser tab (see
  TASK-2 flag). If that is unwanted, restrict the `will-navigate` external
  routing to `mailto:`/`tel:` only.
- Manual desktop verification of the four link types (link-library entry,
  feed entry, todo link, dev-request screenshot) per TASK-3's checklist is
  still outstanding — needs a runnable desktop environment.
- Pre-existing uncommitted job-doc edits (`AGENTS.md` project context,
  analyst's `tasks.md`) were included in the TASK-1 commit because the
  workflow mandates `git add -A`.
