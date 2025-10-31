function HelpPanel() {
  return (
    <div className="p-4 bg-white rounded-card ring-1 ring-gray-200">
      <h2 className="font-medium mb-2">Help</h2>
      <ul className="text-sm list-disc pl-4 space-y-1">
        <li>
          Use <code>DRY_RUN=1</code> to avoid sending POST requests
        </li>
        <li>
          Env is loaded from <code>.env</code> (dev) or userData (prod)
        </li>
        <li>
          <code>state.json</code> keeps lastId and hashes per PK
        </li>
      </ul>
    </div>
  );
}

export default HelpPanel;
