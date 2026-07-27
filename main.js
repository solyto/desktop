const { app, BrowserWindow, protocol, net, session, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Flatpak ships its own update mechanism; the in-app updater must stay dormant there.
const isFlatpak = !!process.env.FLATPAK_ID;
const { pathToFileURL } = require('url');
const fs = require('fs');

const BUILD_DIR = path.join(__dirname, 'frontend', 'build');
const PROTOCOL = 'solyto';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// Under Flatpak the solyto:// handler is registered via the desktop file's MimeType;
// calling this at runtime just fails noisily (no xdg-settings in the sandbox).
if (!isFlatpak) app.setAsDefaultProtocolClient(PROTOCOL);

let mainWindow = null;

function handleDeepLink(url) {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  mainWindow.loadURL('app://localhost/auth/login');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const url = argv.find(arg => arg.startsWith(PROTOCOL + '://'));
    handleDeepLink(url);
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('app://localhost/');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = path.join(BUILD_DIR, pathname);
    const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(BUILD_DIR, 'index.html');
    return net.fetch(pathToFileURL(target).toString());
  });

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://api.solyto.app/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['app://localhost'],
          'Access-Control-Allow-Headers': ['*'],
          'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
        }
      });
    }
  );

  ipcMain.on('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize());
  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });
  ipcMain.on('window:close', () => BrowserWindow.getFocusedWindow()?.close());

  createWindow();

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:status', { type: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:status', { type: 'up-to-date' });
  });
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:status', { type: 'downloading', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:status', { type: 'ready' });
  });
  autoUpdater.on('error', () => {
    mainWindow?.webContents.send('updater:status', { type: 'error' });
  });

  ipcMain.handle('updater:check', () => {
    if (isFlatpak) return Promise.resolve(null);
    return autoUpdater.checkForUpdates();
  });
  ipcMain.on('updater:install', () => {
    if (!isFlatpak) autoUpdater.quitAndInstall();
  });

  if (!isFlatpak) autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = null;
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
