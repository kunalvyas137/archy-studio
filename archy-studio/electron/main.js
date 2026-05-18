import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Port finder ──────────────────────────────────────────────────────────────
function findFreePort(start = 3101) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', () => findFreePort(start + 1).then(resolve, reject));
    server.listen(start, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// ── Resolve archy binary ─────────────────────────────────────────────────────
function resolveArchyPath() {
  const candidates = [
    // Most common: global npm install
    '/usr/local/bin/archy',
    '/usr/bin/archy',
    // macOS homebrew / nvm paths
    `${process.env.HOME}/.npm-global/bin/archy`,
    `${process.env.HOME}/.nvm/versions/node/v20/bin/archy`,
    // User's local archy install (as seen in this project)
    `${process.env.HOME}/archy/archy`,
    // PATH fallback (shell: true handles this)
    'archy',
  ];
  return candidates;
}

let mainWindow = null;
let apiPort = null;
let serverProcess = null;

// ── Start embedded API server ────────────────────────────────────────────────
async function startApiServer() {
  apiPort = await findFreePort();

  // In production, run the bundled server; in dev, it's already running
  if (!isDev) {
    const serverPath = join(__dirname, '..', 'server', 'server.js');
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        ARCHY_STUDIO_PORT: String(apiPort),
        ARCHY_PATH_CANDIDATES: resolveArchyPath().join(':'),
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (d) => console.log('[server]', d.toString().trim()));
    serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString().trim()));
    serverProcess.on('exit', (code) => console.log('[server] exited with code', code));
  }

  return apiPort;
}

// ── Create the BrowserWindow ─────────────────────────────────────────────────
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS native inset traffic lights
    backgroundColor: '#0d1117',
    show: false, // show once ready to avoid flash
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the app
  if (isDev) {
    // In dev: Vite is serving on 5173+
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production: load built index.html
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC: renderer asks for the API port ─────────────────────────────────────
ipcMain.handle('get-api-port', () => apiPort || 3001);

// ── macOS menu ───────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'ARCHY Studio',
      submenu: [
        { role: 'about', label: 'About ARCHY Studio' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ARCHY Studio' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const port = await startApiServer();
  buildMenu();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
