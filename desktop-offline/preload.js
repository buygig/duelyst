const { contextBridge, ipcRenderer } = require('electron');

function randomUUID() {
  return crypto.randomUUID();
}

contextBridge.exposeInMainWorld('isDesktop', true);
contextBridge.exposeInMainWorld('quitDesktop', () => {
  ipcRenderer.send('offline:quit');
});
contextBridge.exposeInMainWorld('openUrl', (url) => {
  ipcRenderer.send('offline:open-external', url);
});
contextBridge.exposeInMainWorld('uuid', {
  v4: () => randomUUID(),
});
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: () => {},
  send: () => {},
});
