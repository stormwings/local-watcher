import { useWatcher } from "@/src/hooks/useWatcher";
import Header from "@/src/components/Header";
import StatusPanel from "@/src/components/StatusPanel";
import HelpPanel from "@/src/components/HelpPanel";
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

  const isRunning = Boolean(status.running);
  const statusBadgeClass = isRunning
    ? "ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800"
    : "ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <Header />

        {!bridgeAvailable && (
          <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
            Running without Electron bridge. Open the Electron app (not only the
            Vite URL).
          </div>
        )}

        <section className="flex items-center gap-3 mb-4">
          <button
            onClick={start}
            type="button"
            className="px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
          >
            Start
          </button>
          <button
            onClick={stop}
            type="button"
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
          >
            Stop
          </button>
          <span
            className={statusBadgeClass}
            aria-label={isRunning ? "watcher running" : "watcher stopped"}
          >
            {isRunning ? "running" : "stopped"}
          </span>
          <button
            onClick={openStateDir}
            type="button"
            className="ml-auto text-sm underline"
          >
            Open state folder
          </button>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-1">
            <StatusPanel status={status} />
          </div>
          <div className="md:col-span-1">
            <HelpPanel />
          </div>
          <div className="md:col-span-1">
            <SettingsPanel onTest={testConnection} />
          </div>
        </section>

        <LogsPanel logs={logs} />
      </div>
    </div>
  );
}

export default App;
