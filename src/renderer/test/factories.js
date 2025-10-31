export function makeStatus(overrides = {}) {
  return {
    table: "articulos",
    pk: "id_articulo",
    updatedAtCol: "updated_at",
    intervalMs: 3000,
    lastTs: "2025-10-31 10:00:00",
    lastId: 123,
    running: false,
    ...overrides,
  };
}

export function makeLog(line = "sample log") {
  return `[10:00:00] ${line}`;
}
