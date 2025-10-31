import { useEffect, useState, useCallback, useMemo } from "react";
import { getWatcherClient } from "../lib/watcherClient";

const MAX_LOGS = 500;

export function useWatcher() {
  const [status, setStatus] = useState({
    running: false,
    table: "-",
    pk: "-",
    updatedAtCol: null,
    intervalMs: 0,
    lastTs: null,
    lastId: null,
  });
  const [logs, setLogs] = useState([]);
  const [bridgeAvailable, setBridgeAvailable] = useState(true);

  const client = useMemo(() => getWatcherClient(), []);

  const pushLog = useCallback((message) => {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    setLogs((prev) => {
      const next = [...prev, line];
      if (next.length > MAX_LOGS) next.splice(0, next.length - MAX_LOGS);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!client) {
      setBridgeAvailable(false);
      pushLog("preload / watcher bridge NOT available");
      return;
    }

    setBridgeAvailable(true);

    const off = client.onLog((line) => pushLog(line));

    client
      .status()
      .then((st) => {
        setStatus(st);
        pushLog("App ready");
      })
      .catch((error) => pushLog(`[ERROR] ${error.message || error}`));

    return () => off?.();
  }, [client, pushLog]);

  const exec = useCallback(
    async (action, setter = setStatus) => {
      if (!client) return;
      const fn = client[action];
      if (typeof fn !== "function") return;
      const result = await fn();
      if (setter && result) setter(result);
    },
    [client]
  );

  const start = () => exec("start");
  const stop = () => exec("stop");
  const openStateDir = () => exec("openStateDir", null);

  const testConnection = async () => {
    if (!client) return { ok: false, error: "watcher bridge not available" };
    if (!client.testConnection)
      return { ok: false, error: "testConnection not implemented" };
    return client.testConnection();
  };

  return {
    status,
    logs,
    start,
    stop,
    openStateDir,
    testConnection,
    bridgeAvailable,
  };
}
