function Header() {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Watcher</h1>
        <p className="text-sm text-gray-500">
          MySQL → HTTP bridge with HMAC and state.json
        </p>
      </div>
    </header>
  );
}

export default Header;
