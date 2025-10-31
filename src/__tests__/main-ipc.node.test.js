import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerWatcherIpc } from "../main-ipc";

describe("registerWatcherIpc", () => {
  let ipcMain;
  let shell;
  let app;
  let watcher;
  let sendLog;

  beforeEach(() => {
    ipcMain = {
      handle: vi.fn(),
    };
    shell = {
      openPath: vi.fn().mockResolvedValue(""),
    };
    app = {
      getPath: vi.fn().mockReturnValue("/fake/userData"),
    };
    watcher = {
      start: vi.fn().mockResolvedValue({ running: true }),
      stop: vi.fn().mockResolvedValue(undefined),
      status: vi.fn().mockReturnValue({
        running: false,
        table: "articulos",
      }),
      testConnection: vi.fn().mockResolvedValue({
        table: "articulos",
        tableExists: true,
        db: "test",
      }),
    };
    sendLog = vi.fn();
  });

  it("registers all watcher IPC handlers", () => {
    registerWatcherIpc({ ipcMain, shell, app, watcher, sendLog });

    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);

    expect(channels).toContain("watcher:start");
    expect(channels).toContain("watcher:stop");
    expect(channels).toContain("watcher:status");
    expect(channels).toContain("watcher:openStateDir");
    expect(channels).toContain("watcher:testConnection");
  });

  it("starts the watcher and logs", async () => {
    registerWatcherIpc({ ipcMain, shell, app, watcher, sendLog });

    const [, handler] = ipcMain.handle.mock.calls.find(
      (c) => c[0] === "watcher:start"
    );

    const res = await handler();

    expect(watcher.start).toHaveBeenCalledTimes(1);
    expect(sendLog).toHaveBeenCalledWith("Watcher started");
    expect(res.running).toBe(true);
  });

  it("stops the watcher and returns status", async () => {
    registerWatcherIpc({ ipcMain, shell, app, watcher, sendLog });

    const [, handler] = ipcMain.handle.mock.calls.find(
      (c) => c[0] === "watcher:stop"
    );

    const res = await handler();

    expect(watcher.stop).toHaveBeenCalledTimes(1);
    expect(watcher.status).toHaveBeenCalledTimes(1);
    expect(res.table).toBe("articulos");
  });

  it("opens the userData directory", async () => {
    registerWatcherIpc({ ipcMain, shell, app, watcher, sendLog });

    const [, handler] = ipcMain.handle.mock.calls.find(
      (c) => c[0] === "watcher:openStateDir"
    );

    const result = await handler();

    expect(app.getPath).toHaveBeenCalledWith("userData");
    expect(shell.openPath).toHaveBeenCalledWith("/fake/userData");
    expect(result).toBe("/fake/userData");
  });

  it("returns ok=false when testConnection fails", async () => {
    watcher.testConnection.mockRejectedValueOnce(new Error("boom"));

    registerWatcherIpc({ ipcMain, shell, app, watcher, sendLog });

    const [, handler] = ipcMain.handle.mock.calls.find(
      (c) => c[0] === "watcher:testConnection"
    );

    const result = await handler();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("boom");
  });
});
