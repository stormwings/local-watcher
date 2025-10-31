function LogsPanel({ logs = [] }) {
  return (
    <section className="p-4 bg-white rounded-card border border-slate-100 shadow-sm">
      <h2 className="font-semibold mb-3 text-slate-900">Logs</h2>
      <div className="h-72 overflow-auto font-mono text-xs bg-slate-50/70 p-2 rounded border border-slate-100">
        {logs.length === 0 ? (
          <div className="text-slate-400">No logs yet…</div>
        ) : (
          logs.map((line, index) => <div key={index}>{line}</div>)
        )}
      </div>
    </section>
  );
}

export default LogsPanel;
