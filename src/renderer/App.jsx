import { useWatcher } from "@/src/hooks/useWatcher";
import Header from "@/src/components/Header";
import StatusPanel from "@/src/components/StatusPanel";
import LogsPanel from "@/src/components/LogsPanel";
import SettingsPanel from "@/src/components/SettingsPanel";

function App() {
  const {
    status,
    logs,
    start,
    stop,
    openStateDir,
    testConnection,
    bridgeAvailable,
  } = useWatcher();

  const badgeClass = status.running
    ? "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
    : "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  return (
    <div className="app-shell">
      <Header />

      <div className="page-width py-6 flex gap-6">
        <div className="flex-1 flex flex-col gap-4">
          {bridgeAvailable ? null : (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              Running without Electron bridge. Open the Electron app (not just
              the Vite URL).
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={start}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition"
              >
                Start
              </button>
              <button
                onClick={stop}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition"
              >
                Stop
              </button>
            </div>
            <span className={badgeClass}>
              {status.running ? "running" : "stopped"}
            </span>
            <button
              onClick={openStateDir}
              className="ml-auto text-xs underline text-slate-500 hover:text-slate-700"
            >
              Open state folder
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <StatusPanel status={status} />
            </div>
            <div className="lg:col-span-1">
              <SettingsPanel onTest={testConnection} />
            </div>
          </div>

          <LogsPanel logs={logs} />
        </div>

        <aside className="w-[320px] hidden xl:block">
          <div className="sticky top-20 bg-white rounded-2xl shadow-sheet border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Current status
              </h2>
              <span className={badgeClass}>
                {status.running ? "running" : "stopped"}
              </span>
            </div>
            <div className="text-xs text-slate-500 pb-2 border-b border-slate-100">
              Table <span className="font-mono">{status.table || "-"}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Primary key</span>
                <span className="font-mono text-slate-900">
                  {status.pk || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Interval</span>
                <span className="font-mono text-slate-900">
                  {status.intervalMs} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last ID</span>
                <span className="font-mono text-slate-900">
                  {status.lastId ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last timestamp</span>
                <span className="font-mono text-right max-w-[140px] truncate">
                  {status.lastTs ?? "—"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-400">
                Tip: keep this panel open while you monitor the MySQL table.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
