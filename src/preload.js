const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("watcher", {
  start: () => ipcRenderer.invoke("watcher:start"),
  stop: () => ipcRenderer.invoke("watcher:stop"),
  status: () => ipcRenderer.invoke("watcher:status"),
  openStateDir: () => ipcRenderer.invoke("watcher:openStateDir"),
  testConnection: () => ipcRenderer.invoke("watcher:testConnection"),
  onLog: (cb) => {
    const handler = (_e, line) => cb(line);
    ipcRenderer.on("watcher:log", handler);
    return () => ipcRenderer.off("watcher:log", handler);
  },
});

contextBridge.exposeInMainWorld("sys", {
  openExternal: (url) => shell.openExternal(url),
});
