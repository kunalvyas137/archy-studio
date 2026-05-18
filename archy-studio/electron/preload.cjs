// preload.cjs — runs in a sandboxed context before the renderer loads
// Uses CommonJS because Electron preloads must be CJS (not ESM)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  /** Returns the port the embedded API server is listening on */
  getApiPort: () => ipcRenderer.invoke('get-api-port'),

  /** Open a native file/folder picker */
  openFile: (opts) => ipcRenderer.invoke('open-file', opts),

  /** App version */
  version: process.env.npm_package_version || '1.0.0',

  /** Platform */
  platform: process.platform,
});
