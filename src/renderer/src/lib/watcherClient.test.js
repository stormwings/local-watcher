import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getWatcherClient } from "./watcherClient";

describe("getWatcherClient", () => {
  const realWindow = global.window;

  beforeEach(() => {
    global.window = {};
  });

  afterEach(() => {
    global.window = realWindow;
  });

  it("returns null when window is undefined", () => {
    global.window = undefined;
    const client = getWatcherClient();
    expect(client).toBeNull();
  });

  it("returns null when window.watcher is missing", () => {
    global.window = {};
    const client = getWatcherClient();
    expect(client).toBeNull();
  });

  it("returns client and delegates to window.watcher", async () => {
    const start = vi.fn().mockResolvedValue({ running: true });
    const status = vi.fn().mockResolvedValue({ table: "articulos" });
    const onLog = vi.fn();

    global.window = {
      watcher: { start, status, onLog },
    };

    const client = getWatcherClient();
    expect(client).not.toBeNull();

    await client.start();
    await client.status();

    expect(start).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledTimes(1);
  });

  it("returns noop unsubscribe when onLog is missing", () => {
    global.window = {
      watcher: {},
    };

    const client = getWatcherClient();
    const off = client.onLog(() => {});
    expect(typeof off).toBe("function");
    off();
  });
});
