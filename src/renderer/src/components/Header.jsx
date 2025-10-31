function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200 mb-6">
      <div className="page-width h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm">
            B
          </div>
          <div>
            <h1 className="mb-1 text-lg font-semibold leading-none tracking-tight">
              Black Watcher
            </h1>
            <p className="text-[11px] text-slate-500">
              Database synchronization watcher
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
