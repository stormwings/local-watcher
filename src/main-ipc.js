function registerWatcherIpc({ ipcMain, shell, app, watcher, sendLog }) {
  if (!ipcMain || !watcher) {
    throw new Error("ipcMain and watcher are required");
  }

  ipcMain.handle("watcher:start", async () => {
    try {
      const result = await watcher.start();
      sendLog?.("Watcher started");
      return result || (await watcher.status());
    } catch (err) {
      sendLog?.(`[ERROR] ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle("watcher:stop", async () => {
    await watcher.stop();
    return watcher.status();
  });

  ipcMain.handle("watcher:status", async () => watcher.status());

  ipcMain.handle("watcher:openStateDir", async () => {
    const dir = app.getPath("userData");
    await shell.openPath(dir);
    return dir;
  });

  ipcMain.handle("watcher:testConnection", async () => {
    try {
      const res = await watcher.testConnection();
      return { ok: true, ...res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerWatcherIpc };
