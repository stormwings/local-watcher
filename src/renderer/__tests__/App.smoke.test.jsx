import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App.jsx";

describe("App smoke test", () => {
  const realWatcher = window.watcher;

  const baseStatus = {
    running: false,
    table: "articulos",
    pk: "id_articulo",
    updatedAtCol: "updated_at",
    intervalMs: 3000,
    lastTs: "2025-10-31 10:00:00",
    lastId: 10,
  };

  let statusMock;
  let startMock;
  let stopMock;
  let onLogMock;
  let openStateDirMock;
  let testConnectionMock;

  beforeEach(() => {
    statusMock = vi.fn().mockResolvedValue(baseStatus);
    startMock = vi.fn().mockResolvedValue({
      ...baseStatus,
      running: true,
      lastId: 11,
    });
    stopMock = vi.fn().mockResolvedValue({
      ...baseStatus,
      running: false,
    });
    onLogMock = vi.fn().mockImplementation((cb) => {
      cb("App ready");
      cb("App ready");
      return () => {};
    });
    openStateDirMock = vi.fn().mockResolvedValue(undefined);
    testConnectionMock = vi.fn().mockResolvedValue({ ok: true });

    window.watcher = {
      status: statusMock,
      start: startMock,
      stop: stopMock,
      onLog: onLogMock,
      openStateDir: openStateDirMock,
      testConnection: testConnectionMock,
    };
  });

  afterEach(() => {
    window.watcher = realWatcher;
    vi.clearAllMocks();
  });

  it("renders and executes start/stop flow", async () => {
    render(<App />);

    await waitFor(() => expect(statusMock).toHaveBeenCalledTimes(1));

    const stoppedBadges = screen.getAllByText(/stopped/i);
    expect(stoppedBadges.length).toBeGreaterThan(0);

    const logEntries = screen.getAllByText(/App ready/i);
    expect(logEntries.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText(/running/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText(/stopped/i).length).toBeGreaterThan(0);
  });
});
