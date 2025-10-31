function StatusPanel({ status = {} }) {
  const {
    table = "-",
    pk = "-",
    updatedAtCol = "—",
    intervalMs = 0,
    lastTs = "—",
    lastId = "—",
  } = status;

  return (
    <div className="p-4 bg-white rounded-card border border-slate-100 shadow-sm">
      <h2 className="font-semibold mb-3 text-slate-900">Status</h2>
      <dl className="text-sm space-y-2">
        <div className="flex justify-between">
          <dt className="text-slate-500">Table:</dt>
          <dd className="font-mono text-slate-900">{table}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Primary key:</dt>
          <dd className="font-mono text-slate-900">{pk}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Updated-at column:</dt>
          <dd className="font-mono text-slate-900">{updatedAtCol ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Interval:</dt>
          <dd className="font-mono text-slate-900">{intervalMs} ms</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Last timestamp:</dt>
          <dd className="font-mono text-slate-900">{lastTs ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Last ID:</dt>
          <dd className="font-mono text-slate-900">{lastId ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

export default StatusPanel;
