import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWatcher } from "./useWatcher";

describe("useWatcher", () => {
  const fixedDate = new Date("2025-10-31T10:00:00Z");
  const realWatcher = window.watcher;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
    delete window.watcher;
  });

  afterEach(() => {
    if (realWatcher) {
      window.watcher = realWatcher;
    } else {
      delete window.watcher;
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns bridgeAvailable=false when bridge is missing", () => {
    const { result } = renderHook(() => useWatcher());
    expect(result.current.bridgeAvailable).toBe(false);
    expect(result.current.logs.length).toBeGreaterThan(0);
    expect(result.current.status.table).toBe("-");
  });

  it("loads initial status when bridge exists", async () => {
    const status = vi.fn().mockResolvedValue({
      running: false,
      table: "articulos",
      pk: "id_articulo",
      updatedAtCol: "updated_at",
      intervalMs: 3000,
      lastTs: "2025-10-31 10:00:00",
      lastId: 10,
    });

    const onLog = vi.fn().mockImplementation((cb) => {
      cb("Watcher initialized");
      return () => {};
    });

    window.watcher = {
      status,
      onLog,
      start: vi.fn(),
      stop: vi.fn(),
      openStateDir: vi.fn(),
      testConnection: vi.fn(),
    };

    const { result } = renderHook(() => useWatcher());

    await act(async () => {});

    expect(result.current.bridgeAvailable).toBe(true);
    expect(result.current.status.table).toBe("articulos");
    expect(onLog).toHaveBeenCalled();
    expect(
      result.current.logs.some((line) => line.includes("Watcher initialized"))
    ).toBe(true);
  });

  it("starts and updates status", async () => {
    const status = vi.fn().mockResolvedValue({
      running: false,
      table: "articulos",
      pk: "id_articulo",
      updatedAtCol: "updated_at",
      intervalMs: 3000,
      lastTs: "2025-10-31 10:00:00",
      lastId: 10,
    });

    const start = vi.fn().mockResolvedValue({
      running: true,
      table: "articulos",
      pk: "id_articulo",
      updatedAtCol: "updated_at",
      intervalMs: 3000,
      lastTs: "2025-10-31 10:00:00",
      lastId: 11,
    });

    window.watcher = {
      status,
      onLog: vi.fn().mockReturnValue(() => {}),
      start,
      stop: vi.fn(),
      openStateDir: vi.fn(),
      testConnection: vi.fn(),
    };

    const { result } = renderHook(() => useWatcher());

    await act(async () => {});

    await act(async () => {
      await result.current.start();
    });

    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current.status.running).toBe(true);
    expect(result.current.status.lastId).toBe(11);
  });

  it("truncates logs to max size", async () => {
    const MAX = 500;

    window.watcher = {
      status: vi.fn().mockResolvedValue({
        running: false,
        table: "articulos",
        pk: "id_articulo",
        updatedAtCol: null,
        intervalMs: 3000,
        lastTs: null,
        lastId: null,
      }),
      onLog: (cb) => {
        for (let i = 0; i < MAX + 20; i += 1) {
          cb(`line ${i}`);
        }
        return () => {};
      },
    };

    const { result } = renderHook(() => useWatcher());

    await act(async () => {});

    expect(result.current.logs.length).toBe(MAX);
    expect(result.current.logs[0]).toContain("line 21");
    const last = result.current.logs[result.current.logs.length - 1];
    expect(last).toContain("App ready");
  });
});
