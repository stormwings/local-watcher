const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

function createWatcher(opts) {
  const {
    appName,
    userDataDir,
    env,
    onLog = () => {},
    onError = () => {},
  } = opts;

  const log = (...a) => onLog(a.map(String).join(" "));
  const err = (...a) => onError(a.map(String).join(" "));

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

  const updatedAtCol = String(UPDATED_AT_COLUMN || "").trim();
  const hasUpdatedAt = updatedAtCol.length > 0;

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
      const s = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      return {
        lastTs: s.lastTs ?? null,
        lastId: Number.isFinite(s.lastId) ? s.lastId : 0,
        hashesById: s.hashesById ?? {},
        scanFromId: Number.isFinite(s.scanFromId) ? s.scanFromId : 0,
        pollCounter: Number.isFinite(s.pollCounter) ? s.pollCounter : 0,
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

  function saveState(s) {
    fs.writeFileSync(stateFile, JSON.stringify(s, null, 2));
  }

  function hmac(body) {
    if (!API_SECRET) return null;
    return crypto
      .createHmac("sha256", API_SECRET)
      .update(body, "utf8")
      .digest("hex");
  }

  const hashCols = (HASH_COLUMNS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  function normalizeDecimal(v, digits = 2) {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toFixed(digits);
  }

  function normalizeValue(col, v) {
    if (col === "precio_mayor") return normalizeDecimal(v, 2);
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
    if (typeof v === "boolean") return v ? "1" : "0";
    return String(v);
  }

  function toProductPayload(row) {
    const out = {};
    for (const col of PRODUCT_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(row, col)) {
        out[col] = row[col];
      }
    }
    // ensure all PK is always included
    if (!out[PK_COLUMN] && row[PK_COLUMN] !== undefined) {
      out[PK_COLUMN] = row[PK_COLUMN];
    }
    return out;
  }

  function rowHash(row) {
    const obj = {};
    for (const c of hashCols) obj[c] = normalizeValue(c, row[c]);
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
    updatedAtCol: hasUpdatedAt ? updatedAtCol : null,
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
    if (!rows || !rows.length || rows[0].two !== 2)
      throw new Error("MySQL sanity check failed");
    return pool;
  }

  async function initStateIfNeeded() {
    if (!state.lastTs && hasUpdatedAt) {
      const [r] = await pool.query("SELECT NOW() AS now");
      state.lastTs =
        r?.[0]?.now || new Date().toISOString().slice(0, 19).replace("T", " ");
      saveState(state);
    }
  }

  async function postChange(eventType, row, eventIdHint) {
    const product = toProductPayload(row);
    const payload = {
      eventType,
      source: SOURCE_TAG,
      table: TABLE_NAME,
      primaryKey: { [PK_COLUMN]: row[PK_COLUMN] },
      data: product,
      occurredAt: hasUpdatedAt
        ? new Date(row[updatedAtCol]).toISOString()
        : new Date().toISOString(),
    };
    const body = JSON.stringify(payload);
    const eventId = eventIdHint;
    if (DRY_RUN === "1") {
      log(`(dry-run) POST -> ${eventId}`);
      return;
    }
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event-Id": eventId,
        ...(API_SECRET ? { "X-Signature": hmac(body) } : {}),
      },
      body,
    });
    if (![200, 202, 409].includes(res.status)) {
      const text = await res.text().catch(() => "");
      throw new Error(`POST failed [${res.status}] ${text.slice(0, 300)}`);
    }
    log(`POST ok ${res.status} -> ${eventId}`);
  }

  async function pollUpdatedAtMode() {
    const [rows] = await pool.query(
      `SELECT * FROM \`${TABLE_NAME}\`
       WHERE \`${updatedAtCol}\` > ?
       ORDER BY \`${updatedAtCol}\`, \`${PK_COLUMN}\`
       LIMIT 500`,
      [state.lastTs]
    );
    if (!rows.length) return;

    for (const row of rows) {
      const eventId = `${TABLE_NAME}:${row[PK_COLUMN]}:${row[updatedAtCol]}`;
      await postChange("ROW_UPDATED", row, eventId);
      state.lastTs = row[updatedAtCol];
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
        const h = rowHash(row);
        state.hashesById[id] = h;
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
    for (const r of scanRows) {
      const id = Number(r[PK_COLUMN]) || 0;
      const minimal = { precio_mayor: r.precio_mayor, [PK_COLUMN]: id };
      const h = rowHash(minimal);
      const prev = state.hashesById[id];

      if (prev && prev !== h) {
        const [[full]] = await pool.query(
          `SELECT * FROM \`${TABLE_NAME}\` WHERE \`${PK_COLUMN}\` = ? LIMIT 1`,
          [id]
        );
        const currentVal = normalizeValue("precio_mayor", full?.precio_mayor);
        const eventId = `${TABLE_NAME}:${id}:precio_mayor:${currentVal}`;
        await postChange("ROW_UPDATED", full, eventId);
        state.hashesById[id] = h;
      } else if (!prev && id <= state.lastId) {
        state.hashesById[id] = h;
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
      err("poll error:", e.message);
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

  return { start, stop, status };
}

module.exports = { createWatcher };
