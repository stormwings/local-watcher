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
  } = env;

  if (!TABLE_NAME || !PK_COLUMN || !API_URL) {
    throw new Error("Missing required env: TABLE_NAME, PK_COLUMN, API_URL");
  }

  const stateFile = path.join(userDataDir, "state.json");

  function loadState() {
    try {
      return JSON.parse(fs.readFileSync(stateFile, "utf8"));
    } catch {
      return { lastTs: null, lastId: 0 };
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
    updatedAtCol: UPDATED_AT_COLUMN || null,
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
    if (!state.lastTs && UPDATED_AT_COLUMN) {
      const [r] = await pool.query("SELECT NOW() AS now");
      state.lastTs =
        r?.[0]?.now || new Date().toISOString().slice(0, 19).replace("T", " ");
      saveState(state);
    }
  }

  async function poll() {
    if (busy) return;
    busy = true;
    try {
      await ensurePool();
      await initStateIfNeeded();

      let rows = [];
      if (UPDATED_AT_COLUMN) {
        const [r] = await pool.query(
          `SELECT * FROM \`${TABLE_NAME}\`
           WHERE \`${UPDATED_AT_COLUMN}\` > ?
           ORDER BY \`${UPDATED_AT_COLUMN}\`, \`${PK_COLUMN}\`
           LIMIT 500`,
          [state.lastTs]
        );
        rows = r;
      } else {
        const [r] = await pool.query(
          `SELECT * FROM \`${TABLE_NAME}\`
           WHERE \`${PK_COLUMN}\` > ?
           ORDER BY \`${PK_COLUMN}\`
           LIMIT 500`,
          [state.lastId]
        );
        rows = r;
      }

      if (!rows.length) return;

      for (const row of rows) {
        const payload = {
          eventType: UPDATED_AT_COLUMN ? "ROW_UPDATED" : "ROW_INSERTED",
          occurredAt: UPDATED_AT_COLUMN
            ? new Date(row[UPDATED_AT_COLUMN]).toISOString()
            : new Date().toISOString(),
          source: SOURCE_TAG,
          table: TABLE_NAME,
          primaryKey: { [PK_COLUMN]: row[PK_COLUMN] },
          data: row,
        };

        const body = JSON.stringify(payload);
        const eventId = `${TABLE_NAME}:${row[PK_COLUMN]}:${
          UPDATED_AT_COLUMN ? row[UPDATED_AT_COLUMN] : "ins"
        }`;

        if (DRY_RUN === "1") {
          log(`(dry-run) POST -> ${eventId}`);
        } else {
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
            throw new Error(
              `POST failed [${res.status}] ${text.slice(0, 300)}`
            );
          }
          log(`POST ok ${res.status} -> ${eventId}`);
        }

        if (UPDATED_AT_COLUMN) {
          state.lastTs = row[UPDATED_AT_COLUMN];
        } else {
          const id = Number(row[PK_COLUMN]) || state.lastId;
          if (id > state.lastId) state.lastId = id;
        }
      }
      saveState(state);
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
