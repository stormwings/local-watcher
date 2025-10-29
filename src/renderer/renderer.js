document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const logsEl = $("logs");
  const badge = $("badge");

  const pushLog = (line) => {
    const el = document.createElement("div");
    el.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
    logsEl.appendChild(el);
    logsEl.scrollTop = logsEl.scrollHeight;
  };

  const setBadge = (running) => {
    if (running) {
      badge.textContent = "running";
      badge.className =
        "ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800";
    } else {
      badge.textContent = "stopped";
      badge.className =
        "ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800";
    }
  };

  const renderStatus = (st) => {
    $("stTable").textContent = st.table;
    $("stPk").textContent = st.pk;
    $("stUpd").textContent = st.updatedAtCol ?? "—";
    $("stInt").textContent = `${st.intervalMs} ms`;
    $("stLastTs").textContent = st.lastTs ?? "—";
    $("stLastId").textContent = st.lastId ?? "—";
    setBadge(st.running);
  };

  $("btnStart").addEventListener("click", async () => {
    try {
      const st = await window.watcher.start();
      renderStatus(st);
    } catch (e) {
      pushLog(`[ERROR] ${e.message || e}`);
    }
  });

  $("btnStop").addEventListener("click", async () => {
    try {
      const st = await window.watcher.stop();
      renderStatus(st);
    } catch (e) {
      pushLog(`[ERROR] ${e.message || e}`);
    }
  });

  $("btnOpenState").addEventListener("click", async () => {
    try {
      await window.watcher.openStateDir();
    } catch (e) {
      pushLog(`[ERROR] ${e.message || e}`);
    }
  });

  window.watcher.onLog((line) => pushLog(line));

  (async () => {
    if (!window.watcher) {
      pushLog("[ERROR] preload not loaded (window.watcher undefined)");
      return;
    }
    const st = await window.watcher.status();
    renderStatus(st);
    pushLog("App ready");
  })();
});
