import "@testing-library/jest-dom";

if (typeof window !== "undefined") {
  window.watcher = {
    start: vi.fn(() => Promise.resolve({ running: true })),
    stop: vi.fn(() => Promise.resolve({ running: false })),
    status: vi.fn(() =>
      Promise.resolve({
        running: false,
        table: "-",
        pk: "-",
        updatedAtCol: null,
        intervalMs: 0,
        lastTs: null,
        lastId: null,
      })
    ),
    openStateDir: vi.fn(() => Promise.resolve()),
    testConnection: vi.fn(() =>
      Promise.resolve({
        ok: true,
        table: "articulos",
        tableExists: true,
        db: "test",
      })
    ),
    onLog: vi.fn((cb) => {
      return () => {};
    }),
  };
}
