import { describe, it, expect, vi } from "vitest";

const invoke = vi.fn(async (channel) => ({ channel }));
const on = vi.fn();
const off = vi.fn();
const expose = vi.fn();
const openExternal = vi.fn();

require.cache[require.resolve("electron")] = {
  exports: {
    contextBridge: {
      exposeInMainWorld: expose,
    },
    ipcRenderer: {
      invoke,
      on,
      off,
    },
    shell: {
      openExternal,
    },
  },
};

require("../preload.js");

describe("preload bridge", () => {
  it("exposes watcher API", () => {
    const [, api] = expose.mock.calls.find((c) => c[0] === "watcher");

    expect(typeof api.start).toBe("function");
    expect(typeof api.stop).toBe("function");
    expect(typeof api.status).toBe("function");
    expect(typeof api.openStateDir).toBe("function");
    expect(typeof api.testConnection).toBe("function");
    expect(typeof api.onLog).toBe("function");
  });

  it("delegates watcher methods to ipcRenderer.invoke", async () => {
    const [, api] = expose.mock.calls.find((c) => c[0] === "watcher");

    await api.start();
    await api.stop();
    await api.status();
    await api.openStateDir();
    await api.testConnection();

    expect(invoke).toHaveBeenCalledWith("watcher:start");
    expect(invoke).toHaveBeenCalledWith("watcher:stop");
    expect(invoke).toHaveBeenCalledWith("watcher:status");
    expect(invoke).toHaveBeenCalledWith("watcher:openStateDir");
    expect(invoke).toHaveBeenCalledWith("watcher:testConnection");
  });

  it("subscribes and unsubscribes to watcher logs", () => {
    const [, api] = expose.mock.calls.find((c) => c[0] === "watcher");
    const handler = vi.fn();

    const unsubscribe = api.onLog(handler);

    expect(on).toHaveBeenCalledWith("watcher:log", expect.any(Function));
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();

    expect(off).toHaveBeenCalledWith("watcher:log", expect.any(Function));
  });
});
