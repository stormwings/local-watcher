const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const dotenv = require("dotenv");
const { createWatcher } = require("./watcher");
const { registerWatcherIpc } = require("./main-ipc");

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  dotenv.config({ path: path.join(process.cwd(), ".env") });
} else {
  try {
    const envPath = path.join(app.getPath("userData"), ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  } catch {
    // ignore
  }
}

let mainWindow;
let watcher;

function emitLog(line) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("watcher:log", line);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: isDev ? false : true,
    },
    show: false,
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.removeMenu?.();

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173/");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "..", "dist", "renderer", "index.html")
    );
  }
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createMainWindow();

    watcher = createWatcher({
      appName: app.getName(),
      userDataDir: app.getPath("userData"),
      env: process.env,
      onLog: (line) => emitLog(line),
      onError: (line) => emitLog(`[ERROR] ${line}`),
    });

    registerWatcherIpc({
      ipcMain,
      shell,
      app,
      watcher,
      sendLog: emitLog,
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  try {
    await watcher?.stop();
  } catch {
    // ignore
  }
});
