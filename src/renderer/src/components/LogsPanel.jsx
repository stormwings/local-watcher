function LogsPanel({ logs = [] }) {
  return (
    <section className="p-4 bg-white rounded-card ring-1 ring-gray-200">
      <h2 className="font-medium mb-3">Logs</h2>
      <div className="h-72 overflow-auto font-mono text-sm bg-gray-50 p-2 rounded border border-gray-200">
        {logs.length === 0 ? (
          <div className="text-gray-400">No logs yet…</div>
        ) : (
          logs.map((line, index) => <div key={index}>{line}</div>)
        )}
      </div>
    </section>
  );
}

export default LogsPanel;
