import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("fs", () => {
  const store = {};
  return {
    default: {
      readFileSync: vi.fn((p) => {
        if (!store[p]) throw new Error("ENOENT");
        return store[p];
      }),
      writeFileSync: vi.fn((p, data) => {
        store[p] = data;
      }),
      existsSync: vi.fn(() => true),
    },
  };
});

vi.mock("path", async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    join: (...parts) => parts.join("/"),
  };
});

vi.mock("mysql2/promise", () => {
  const query = vi.fn(async () => [[{ two: 2 }]]);
  const pool = { query, end: vi.fn() };
  return {
    default: {
      createPool: vi.fn(() => pool),
    },
  };
});

const { createWatcher } = await import("../watcher");

describe("createWatcher", () => {
  let logs;
  let errors;

  const baseEnv = {
    DB_HOST: "127.0.0.1",
    DB_PORT: "3306",
    DB_USER: "root",
    DB_PASS: "",
    DB_NAME: "test",
    TABLE_NAME: "articulos",
    PK_COLUMN: "id_articulo",
    API_URL: "https://example.test/hook",
    DRY_RUN: "1",
  };

  global.fetch = vi.fn(async () => ({ status: 200, text: async () => "" }));

  beforeEach(() => {
    logs = [];
    errors = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails when required env is missing", () => {
    expect(() =>
      createWatcher({
        appName: "testapp",
        userDataDir: "/tmp",
        env: {},
        onLog: () => {},
        onError: () => {},
      })
    ).toThrow(/Missing required env/i);
  });

  it("returns initial status", () => {
    const watcher = createWatcher({
      appName: "testapp",
      userDataDir: "/tmp",
      env: baseEnv,
      onLog: (l) => logs.push(l),
      onError: (e) => errors.push(e),
    });

    const status = watcher.status();

    expect(status.running).toBe(false);
    expect(status.table).toBe("articulos");
    expect(status.pk).toBe("id_articulo");
    expect(status.intervalMs).toBe(3000);
  });

  it("starts and stops", async () => {
    const watcher = createWatcher({
      appName: "testapp",
      userDataDir: "/tmp",
      env: baseEnv,
      onLog: (l) => logs.push(l),
      onError: (e) => errors.push(e),
    });

    await watcher.start();
    const runningStatus = watcher.status();

    expect(runningStatus.running).toBe(true);
    expect(logs.some((l) => l.includes("Watching articulos"))).toBe(true);

    await watcher.stop();
    const stoppedStatus = watcher.status();
    expect(stoppedStatus.running).toBe(false);
  });

  it("exposes testConnection", async () => {
    const watcher = createWatcher({
      appName: "testapp",
      userDataDir: "/tmp",
      env: baseEnv,
      onLog: (l) => logs.push(l),
      onError: (e) => errors.push(e),
    });

    const result = await watcher.testConnection();

    expect(result.table).toBe("articulos");
    expect(typeof result.tableExists).toBe("boolean");
  });
});
