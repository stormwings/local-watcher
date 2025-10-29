const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { createWatcher } = require("./watcher");
const dotenv = require("dotenv");

if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(process.cwd(), ".env") });
} else {
  try {
    const p = path.join(app.getPath("userData"), ".env");
    if (fs.existsSync(p)) dotenv.config({ path: p });
  } catch {}
}

let win;
let watcher;

function sendLog(line) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("watcher:log", line);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
    },
    show: false,
  });

  win.on("ready-to-show", () => win.show());
  win.on("closed", () => {
    win = null;
  });

  win.removeMenu?.();
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();

    if (process.env.NODE_ENV === "development") {
      win.webContents.openDevTools({ mode: "detach" });
    }

    watcher = createWatcher({
      appName: app.getName(),
      userDataDir: app.getPath("userData"),
      env: process.env,
      onLog: (l) => sendLog(l),
      onError: (l) => sendLog(`[ERROR] ${l}`),
    });

    ipcMain.handle("watcher:start", async () => {
      try {
        await watcher.start();
        sendLog("Watcher started");
        return watcher.status();
      } catch (e) {
        sendLog(`[ERROR] ${e.message}`);
        throw e;
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
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  try {
    await watcher?.stop();
  } catch {}
});
