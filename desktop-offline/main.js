const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  session,
  shell,
} = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_ID = 'org.openduelyst.offline';
const APP_SCHEME = 'duelyst-offline';
const APP_HOST = 'game';

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
    },
  },
]);

function getGameRoot() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'game');
  return path.resolve(__dirname, '..', 'dist', 'src');
}

function isInsideRoot(rootPath, filePath) {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

function resolveGamePath(requestUrl) {
  let parsedUrl;
  let pathname;
  try {
    parsedUrl = new URL(requestUrl);
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch (error) {
    return null;
  }

  if (parsedUrl.host !== APP_HOST) return null;

  const gameRoot = getGameRoot();
  const relativePath = pathname.replace(/^[/\\]+/, '') || 'index.html';
  const filePath = path.resolve(gameRoot, relativePath);
  return isInsideRoot(gameRoot, filePath) ? filePath : null;
}

function registerGameProtocol() {
  protocol.handle(APP_SCHEME, (request) => {
    const filePath = resolveGamePath(request.url);
    if (!filePath) {
      return new Response('Bad request', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return net.fetch(pathToFileURL(filePath).toString(), {
      method: request.method,
      headers: request.headers,
    });
  });
}

function configureOfflineSession() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    let requestScheme;
    try {
      requestScheme = new URL(details.url).protocol;
    } catch (error) {
      callback({ cancel: true });
      return;
    }

    const allowedSchemes = new Set([
      `${APP_SCHEME}:`,
      'blob:',
      'data:',
      'devtools:',
      'file:',
    ]);
    callback({ cancel: !allowedSchemes.has(requestScheme) });
  });
}

function isExternalUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function isTrustedSender(event) {
  return event.senderFrame != null
    && event.senderFrame.url.startsWith(`${APP_SCHEME}://${APP_HOST}/`);
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const mainWindow = new BrowserWindow({
    title: 'Duelyst Offline',
    width: 1300,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#05070c',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) event.preventDefault();
  });

  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle('Duelyst Offline');
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`).catch((error) => {
    dialog.showErrorBox('Duelyst Offline', `The local game could not be loaded.\n\n${error.message}`);
    app.quit();
  });

  return mainWindow;
}

app.setAppUserModelId(APP_ID);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let mainWindow;

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    const indexPath = path.join(getGameRoot(), 'index.html');
    if (!fs.existsSync(indexPath)) {
      dialog.showErrorBox(
        'Duelyst Offline',
        'Offline game files are missing. Rebuild the installer from a completed offline build.',
      );
      app.quit();
      return;
    }

    registerGameProtocol();
    configureOfflineSession();
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
    });
  });
}

ipcMain.on('offline:quit', (event) => {
  if (isTrustedSender(event)) app.quit();
});
ipcMain.on('offline:open-external', (event, url) => {
  if (isTrustedSender(event) && isExternalUrl(url)) shell.openExternal(url).catch(() => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
