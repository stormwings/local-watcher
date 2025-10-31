export function getWatcherClient() {
  if (typeof window === "undefined" || !window.watcher) {
    return null;
  }

  const api = window.watcher;

  const safeCall = (name, ...args) => {
    try {
      const fn = api?.[name];
      if (typeof fn !== "function") {
        console.warn(`[watcherClient] ${name} not available`);
        return Promise.resolve(null);
      }
      return fn(...args);
    } catch (error) {
      console.error(`[watcherClient] ${name} failed:`, error);
      return Promise.reject(error);
    }
  };

  return {
    start: () => safeCall("start"),
    stop: () => safeCall("stop"),
    status: () => safeCall("status"),
    openStateDir: () => safeCall("openStateDir"),
    testConnection: () => safeCall("testConnection"),
    onLog: (cb) => api.onLog?.(cb) || (() => {}),
  };
}
