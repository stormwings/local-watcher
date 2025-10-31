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
    <div className="p-4 bg-white rounded-card ring-1 ring-gray-200">
      <h2 className="font-medium mb-2">Status</h2>
      <dl className="text-sm space-y-1">
        <div>
          <dt className="inline text-gray-500">Table:</dt>{" "}
          <dd className="inline font-mono">{table}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Primary key:</dt>{" "}
          <dd className="inline font-mono">{pk}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Updated-at column:</dt>{" "}
          <dd className="inline font-mono">{updatedAtCol ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Interval:</dt>{" "}
          <dd className="inline font-mono">{intervalMs} ms</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Last timestamp:</dt>{" "}
          <dd className="inline font-mono">{lastTs ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Last ID:</dt>{" "}
          <dd className="inline font-mono">{lastId ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

export default StatusPanel;
