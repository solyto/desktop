#!/usr/bin/env node
// Re-runnable stub harness for the F5 reload guard in the repo's main.js.
//
// It builds a sandbox in a temp dir containing fake `electron` and
// `electron-updater` modules, copies the REAL main.js next to them, loads it,
// lets app.whenReady() resolve, then fires synthetic `before-input-event`
// inputs at the created window's webContents and checks which ones trigger
// webContents.reload().
//
// This validates the guard's predicate against the real listener code, but
// the inputs are still synthetic — it cannot validate Electron's real event
// shape on a given platform (see implementation.md, TASK-2 notes).
//
// Run from anywhere: node docs/jobs/writing_f5-to-reload/verify/f5-guard-harness.js
// Exits non-zero if any case fails.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAIN_JS = path.join(__dirname, '..', '..', '..', '..', 'main.js');

const ELECTRON_STUB = `'use strict';
const { EventEmitter } = require('events');

class WebContents extends EventEmitter {
	constructor() {
		super();
		this.reloadCount = 0;
	}
	reload() {
		this.reloadCount++;
	}
	send() {}
}

class FakeBrowserWindow {
	constructor() {
		this.webContents = new WebContents();
		module.exports.__state.windows.push(this);
	}
	loadURL() {}
	isMinimized() {
		return false;
	}
	restore() {}
	focus() {}
	minimize() {}
	maximize() {}
	unmaximize() {}
	isMaximized() {
		return false;
	}
	close() {}
	static getFocusedWindow() {
		return module.exports.__state.windows[0] || null;
	}
	static getAllWindows() {
		return module.exports.__state.windows;
	}
}

const app = new EventEmitter();
app.requestSingleInstanceLock = () => true;
app.setAsDefaultProtocolClient = () => {};
app.quit = () => {};
app.whenReady = () => Promise.resolve();

const ipcMain = new EventEmitter();
ipcMain.handle = () => {};

module.exports = {
	__state: { windows: [], applicationMenu: 'unset' },
	app,
	BrowserWindow: FakeBrowserWindow,
	protocol: {
		registerSchemesAsPrivileged() {},
		handle() {}
	},
	net: {
		fetch() {
			return Promise.reject(new Error('net.fetch not expected in harness'));
		}
	},
	session: {
		defaultSession: { webRequest: { onHeadersReceived() {} } }
	},
	Menu: {
		setApplicationMenu(m) {
			module.exports.__state.applicationMenu = m;
		}
	},
	ipcMain
};
`;

const UPDATER_STUB = `'use strict';
const { EventEmitter } = require('events');

class AutoUpdater extends EventEmitter {
	checkForUpdates() {
		return Promise.resolve(null);
	}
	checkForUpdatesAndNotify() {
		return Promise.resolve(null);
	}
	quitAndInstall() {}
}

module.exports = { autoUpdater: new AutoUpdater() };
`;

function buildSandbox() {
	const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f5-verify-'));
	const electronDir = path.join(sandbox, 'node_modules', 'electron');
	const updaterDir = path.join(sandbox, 'node_modules', 'electron-updater');
	fs.mkdirSync(electronDir, { recursive: true });
	fs.mkdirSync(updaterDir, { recursive: true });
	fs.writeFileSync(path.join(electronDir, 'index.js'), ELECTRON_STUB);
	fs.writeFileSync(path.join(updaterDir, 'index.js'), UPDATER_STUB);
	fs.copyFileSync(MAIN_JS, path.join(sandbox, 'main.js'));
	return sandbox;
}

async function main() {
	delete process.env.FLATPAK_ID; // exercise the non-Flatpak path, stubs make it harmless
	const sandbox = buildSandbox();
	let failures = 0;
	try {
		require(path.join(sandbox, 'main.js'));
		// Let app.whenReady() microtasks run so createWindow() has executed.
		await new Promise((resolve) => setImmediate(resolve));

		const electronStub = require(path.join(sandbox, 'node_modules', 'electron'));
		const win = electronStub.__state.windows[0];
		if (!win) throw new Error('main.js did not create a BrowserWindow');
		const wc = win.webContents;

		const press = (input) => {
			const event = {
				prevented: false,
				preventDefault() {
					this.prevented = true;
				}
			};
			const before = wc.reloadCount;
			wc.emit('before-input-event', event, input);
			return { intercepted: event.prevented, reloads: wc.reloadCount - before };
		};

		const cases = [
			['bare F5 keyDown', { type: 'keyDown', key: 'F5' }, true],
			['bare F5 rawKeyDown (Windows-style, no char event)', { type: 'rawKeyDown', key: 'F5' }, true],
			['F5 keyUp (release)', { type: 'keyUp', key: 'F5' }, false],
			['F5 rawKeyUp (release)', { type: 'rawKeyUp', key: 'F5' }, false],
			['F5 char', { type: 'char', key: 'F5' }, false],
			['Ctrl+F5 keyDown', { type: 'keyDown', key: 'F5', control: true }, false],
			['Ctrl+F5 rawKeyDown', { type: 'rawKeyDown', key: 'F5', control: true }, false],
			['Shift+F5 rawKeyDown', { type: 'rawKeyDown', key: 'F5', shift: true }, false],
			['Alt+F5 rawKeyDown', { type: 'rawKeyDown', key: 'F5', alt: true }, false],
			['Meta/Cmd+F5 rawKeyDown', { type: 'rawKeyDown', key: 'F5', meta: true }, false],
			['Ctrl+R (unbound by design, open question 1)', { type: 'rawKeyDown', key: 'r', control: true }, false],
			['plain e (KeyManager shortcut)', { type: 'rawKeyDown', key: 'e' }, false],
			['plain F1 (KeyManager shortcut)', { type: 'rawKeyDown', key: 'F1' }, false],
			['plain Enter', { type: 'rawKeyDown', key: 'Enter' }, false],
			['held F5 auto-repeat (browser-like, intended)', { type: 'rawKeyDown', key: 'F5', isAutoRepeat: true }, true]
		];

		console.log('F5 guard harness against', MAIN_JS);
		for (const [label, input, expectIntercepted] of cases) {
			const { intercepted, reloads } = press(input);
			const ok = intercepted === expectIntercepted && (intercepted ? reloads === 1 : reloads === 0);
			console.log(
				`${ok ? 'PASS' : 'FAIL'} ${label} -> ${
					intercepted ? `preventDefault + reload() x${reloads}` : 'passed through'
				} (expected ${expectIntercepted ? 'intercept' : 'pass-through'})`
			);
			if (!ok) failures++;
		}
		console.log(
			electronStub.__state.applicationMenu === null
				? 'PASS Menu.setApplicationMenu(null) still called (menu stays removed)'
				: 'FAIL Menu.setApplicationMenu(null) not called'
		);
		if (electronStub.__state.applicationMenu !== null) failures++;
	} finally {
		fs.rmSync(sandbox, { recursive: true, force: true });
	}

	if (failures) {
		console.error(`${failures} case(s) failed`);
		process.exit(1);
	}
	console.log('all cases passed');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
