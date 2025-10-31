const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

function createWatcher({
  appName,
  userDataDir,
  env,
  onLog = () => {},
  onError = () => {},
}) {
  const log = (...args) => onLog(args.map(String).join(" "));
  const error = (...args) => onError(args.map(String).join(" "));

  const {
    DB_HOST = "127.0.0.1",
    DB_PORT = "3306",
    DB_USER = "root",
    DB_PASS = "",
    DB_NAME = "",
    TABLE_NAME,
    PK_COLUMN,
    UPDATED_AT_COLUMN = "",
    POLL_INTERVAL_MS = "3000",
    API_URL,
    API_SECRET = "",
    SOURCE_TAG = "mysql-legacy",
    DRY_RUN = "0",
    CHARSET = "latin1",
    HASH_COLUMNS = "precio_mayor",
    SCAN_PAGE_SIZE = "500",
    SCAN_EVERY_N_POLLS = "3",
  } = env;

  if (!TABLE_NAME || !PK_COLUMN || !API_URL) {
    throw new Error("Missing required env: TABLE_NAME, PK_COLUMN, API_URL");
  }

  const updatedAtColumn = String(UPDATED_AT_COLUMN || "").trim();
  const hasUpdatedAt = updatedAtColumn.length > 0;

  const PRODUCT_COLUMNS = [
    "id_articulo",
    "codigo",
    "descripcion",
    "marca",
    "precio_compra",
    "precio_venta",
    "precio_mayor",
    "precio_dolar",
    "precio_anterior",
    "adicional",
    "iva",
    "dolarizado",
    "cantidad",
    "estado",
    "porcentaje",
    "codigo_barra",
    "stock",
  ];

  const stateFile = path.join(userDataDir, "state.json");

  function loadState() {
    try {
      const raw = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      return {
        lastTs: raw.lastTs ?? null,
        lastId: Number.isFinite(raw.lastId) ? raw.lastId : 0,
        hashesById: raw.hashesById ?? {},
        scanFromId: Number.isFinite(raw.scanFromId) ? raw.scanFromId : 0,
        pollCounter: Number.isFinite(raw.pollCounter) ? raw.pollCounter : 0,
      };
    } catch {
      return {
        lastTs: null,
        lastId: 0,
        hashesById: {},
        scanFromId: 0,
        pollCounter: 0,
      };
    }
  }

  function saveState(state) {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  function buildHmac(body) {
    if (!API_SECRET) return null;
    return crypto
      .createHmac("sha256", API_SECRET)
      .update(body, "utf8")
      .digest("hex");
  }

  const hashColumns = (HASH_COLUMNS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  function normalizeDecimal(value, digits = 2) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toFixed(digits);
  }

  function normalizeValue(column, value) {
    if (column === "precio_mayor") return normalizeDecimal(value, 2);
    if (value === null || value === undefined) return "";
    if (typeof value === "number")
      return Number.isFinite(value) ? String(value) : "";
    if (typeof value === "boolean") return value ? "1" : "0";
    return String(value);
  }

  function toProductPayload(row) {
    const output = {};
    for (const column of PRODUCT_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(row, column)) {
        output[column] = row[column];
      }
    }
    if (!output[PK_COLUMN] && row[PK_COLUMN] !== undefined) {
      output[PK_COLUMN] = row[PK_COLUMN];
    }
    return output;
  }

  function computeRowHash(row) {
    const obj = {};
    for (const column of hashColumns) {
      obj[column] = normalizeValue(column, row[column]);
    }
    const json = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash("sha256").update(json, "utf8").digest("hex");
  }

  let pool = null;
  let timer = null;
  let busy = false;
  let running = false;
  const state = loadState();

  const status = () => ({
    running,
    lastTs: state.lastTs,
    lastId: state.lastId,
    table: TABLE_NAME,
    pk: PK_COLUMN,
    updatedAtCol: hasUpdatedAt ? updatedAtColumn : null,
    intervalMs: Number(POLL_INTERVAL_MS),
  });

  async function ensurePool() {
    if (pool) return pool;
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME || undefined,
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0,
      connectTimeout: 5000,
      charset: CHARSET,
    });
    const [rows] = await pool.query("SELECT 1 + 1 AS two");
    if (!rows?.length || rows[0].two !== 2) {
      throw new Error("MySQL sanity check failed");
    }
    return pool;
  }

  async function testConnection() {
    await ensurePool();
    const [rows] = await pool.query("SHOW TABLES LIKE ?", [TABLE_NAME]);
    return {
      table: TABLE_NAME,
      tableExists: Array.isArray(rows) && rows.length > 0,
      db: DB_NAME || null,
    };
  }

  async function initStateIfNeeded() {
    if (!state.lastTs && hasUpdatedAt) {
      const [rows] = await pool.query("SELECT NOW() AS now");
      state.lastTs =
        rows?.[0]?.now ||
        new Date().toISOString().slice(0, 19).replace("T", " ");
      saveState(state);
    }
  }

  async function postChange(eventType, row, eventId) {
    const data = toProductPayload(row);
    const payload = {
      eventType,
      source: SOURCE_TAG,
      table: TABLE_NAME,
      primaryKey: { [PK_COLUMN]: row[PK_COLUMN] },
      data,
      occurredAt: hasUpdatedAt
        ? new Date(row[updatedAtColumn]).toISOString()
        : new Date().toISOString(),
    };
    const body = JSON.stringify(payload);

    if (DRY_RUN === "1") {
      log(`(dry-run) POST -> ${eventId}`);
      return;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event-Id": eventId,
        ...(API_SECRET ? { "X-Signature": buildHmac(body) } : {}),
      },
      body,
    });

    if (response.status === 404) {
      log(`POST skipped (404 not found) -> ${eventId}`);
      return;
    }

    if (![200, 202, 409].includes(response.status)) {
      const text = await response.text().catch(() => "");
      throw new Error(`POST failed [${response.status}] ${text.slice(0, 300)}`);
    }

    log(`POST ok ${response.status} -> ${eventId}`);
  }

  async function pollUpdatedAtMode() {
    const [rows] = await pool.query(
      `SELECT * FROM \`${TABLE_NAME}\`
       WHERE \`${updatedAtColumn}\` > ?
       ORDER BY \`${updatedAtColumn}\`, \`${PK_COLUMN}\`
       LIMIT 500`,
      [state.lastTs]
    );

    if (!rows.length) return;

    for (const row of rows) {
      const eventId = `${TABLE_NAME}:${row[PK_COLUMN]}:${row[updatedAtColumn]}`;
      await postChange("ROW_UPDATED", row, eventId);
      state.lastTs = row[updatedAtColumn];
    }

    saveState(state);
  }

  async function pollInsertOnlyAndScanMode() {
    const [newRows] = await pool.query(
      `SELECT * FROM \`${TABLE_NAME}\`
       WHERE \`${PK_COLUMN}\` > ?
       ORDER BY \`${PK_COLUMN}\`
       LIMIT 500`,
      [state.lastId]
    );

    if (newRows.length) {
      for (const row of newRows) {
        const id = Number(row[PK_COLUMN]) || state.lastId;
        const hash = computeRowHash(row);
        state.hashesById[id] = hash;
        const eventId = `${TABLE_NAME}:${id}:ins`;
        await postChange("ROW_INSERTED", row, eventId);
        if (id > state.lastId) state.lastId = id;
      }
      saveState(state);
    }

    state.pollCounter = (state.pollCounter || 0) + 1;
    const every = Math.max(1, Number(SCAN_EVERY_N_POLLS));

    if (state.pollCounter % every !== 0) {
      saveState(state);
      return;
    }

    const pageSize = Math.max(1, Number(SCAN_PAGE_SIZE));
    const [scanRows] = await pool.query(
      `SELECT \`${PK_COLUMN}\`, \`precio_mayor\`
       FROM \`${TABLE_NAME}\`
       WHERE \`${PK_COLUMN}\` > ?
       ORDER BY \`${PK_COLUMN}\`
       LIMIT ${pageSize}`,
      [state.scanFromId || 0]
    );

    if (!scanRows.length) {
      state.scanFromId = 0;
      saveState(state);
      return;
    }

    let lastSeen = state.scanFromId || 0;

    for (const row of scanRows) {
      const id = Number(row[PK_COLUMN]) || 0;
      const minimalRow = { precio_mayor: row.precio_mayor, [PK_COLUMN]: id };
      const currentHash = computeRowHash(minimalRow);
      const previousHash = state.hashesById[id];

      if (previousHash && previousHash !== currentHash) {
        const [[fullRow]] = await pool.query(
          `SELECT * FROM \`${TABLE_NAME}\` WHERE \`${PK_COLUMN}\` = ? LIMIT 1`,
          [id]
        );
        const currentValue = normalizeValue(
          "precio_mayor",
          fullRow?.precio_mayor
        );
        const eventId = `${TABLE_NAME}:${id}:precio_mayor:${currentValue}`;
        await postChange("ROW_UPDATED", fullRow, eventId);
        state.hashesById[id] = currentHash;
      } else if (!previousHash && id <= state.lastId) {
        state.hashesById[id] = currentHash;
      }

      if (id > lastSeen) lastSeen = id;
    }

    state.scanFromId = lastSeen;
    saveState(state);
  }

  async function poll() {
    if (busy) return;
    busy = true;
    try {
      await ensurePool();
      await initStateIfNeeded();
      if (hasUpdatedAt) {
        await pollUpdatedAtMode();
      } else {
        await pollInsertOnlyAndScanMode();
      }
    } catch (e) {
      error("poll error:", e.message);
      if (
        /ECONN|PROTOCOL|POOL_CLOSED|read ECONNRESET|server has gone away/i.test(
          e.message
        )
      ) {
        try {
          await pool?.end();
        } catch {}
        pool = null;
      }
    } finally {
      busy = false;
    }
  }

  async function start() {
    if (running) return;
    running = true;
    await ensurePool();
    await initStateIfNeeded();
    log(`Watching ${TABLE_NAME} every ${POLL_INTERVAL_MS} ms`);
    timer = setInterval(poll, Number(POLL_INTERVAL_MS));
    setTimeout(poll, 100);
  }

  async function stop() {
    if (!running) return;
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    try {
      await pool?.end();
    } catch {}
    pool = null;
    log("Watcher stopped");
  }

  return {
    start,
    stop,
    status,
    testConnection,
  };
}

module.exports = { createWatcher };
