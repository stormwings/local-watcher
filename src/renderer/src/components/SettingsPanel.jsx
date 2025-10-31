import { useState } from "react";

function SettingsPanel({ onTest }) {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    if (!onTest) {
      setResult({ ok: false, error: "Test API not available in this mode." });
      return;
    }
    setIsTesting(true);
    setResult(null);
    try {
      const response = await onTest();
      setResult(response);
    } catch (error) {
      setResult({ ok: false, error: error.message || String(error) });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-card ring-1 ring-gray-200">
      <h2 className="font-medium mb-2">Diagnostics</h2>
      <p className="text-sm text-gray-500 mb-3">
        Check current DB connection and table visibility.
      </p>
      <button
        onClick={handleTest}
        disabled={isTesting}
        className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-60"
      >
        {isTesting ? "Testing..." : "Test connection"}
      </button>
      {result && (
        <div className="mt-3 text-sm">
          {result.ok ? (
            <div className="text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
              <div>Connection OK</div>
              {result.db ? <div>DB: {result.db}</div> : null}
              <div>
                Table: {result.table} (
                {result.tableExists ? "exists" : "not found"})
              </div>
            </div>
          ) : (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              <div>Connection failed</div>
              <div className="text-xs break-all">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;
