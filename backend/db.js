import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

/**
 * SQLite driver with an automatic fallback:
 *   1. better-sqlite3 (fast, prebuilt binaries; installed as an optional dep)
 *   2. Node's built-in `node:sqlite` (Node >= 23.4 — zero install, so the app
 *      still works even if the native module fails to build on Windows)
 * Both expose the same small API used by this app: exec/pragma/prepare.
 */
async function loadDriver() {
  try {
    const mod = await import('better-sqlite3');
    const db = new mod.default(path.join(dataDir, 'lunchradar.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
  } catch (nativeErr) {
    try {
      const { DatabaseSync } = await import('node:sqlite');
      const inner = new DatabaseSync(path.join(dataDir, 'lunchradar.db'));
      inner.exec('PRAGMA journal_mode = WAL;');
      inner.exec('PRAGMA foreign_keys = ON;');
      console.warn('[db] better-sqlite3 not available — using Node\'s built-in node:sqlite driver (zero install).');
      return {
        exec: (sql) => inner.exec(sql),
        pragma: (p) => inner.exec(`PRAGMA ${p};`),
        prepare: (sql) => inner.prepare(sql),
      };
    } catch {
      console.error('[db] No SQLite driver found. Did you run "npm install" inside the backend folder?');
      console.error('[db] Underlying error:', nativeErr.message);
      throw new Error('SQLite driver not found — run `npm install` in the backend/ folder.');
    }
  }
}

export const db = await loadDriver();

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'student',   -- 'student' | 'admin'
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    emoji         TEXT NOT NULL DEFAULT '🍽️',
    description   TEXT NOT NULL DEFAULT '',
    area          TEXT NOT NULL DEFAULT '',
    cuisine       TEXT NOT NULL DEFAULT 'South Indian',
    price         INTEGER NOT NULL DEFAULT 1,        -- 1 = ₹, 2 = ₹₹, 3 = ₹₹₹
    veg           TEXT NOT NULL DEFAULT 'both',      -- 'veg' | 'nonveg' | 'both'
    walk_minutes  INTEGER NOT NULL DEFAULT 15,       -- approx walk from campus
    opens_at      TEXT NOT NULL DEFAULT '11:00',     -- 'HH:MM'
    closes_at     TEXT NOT NULL DEFAULT '15:30',
    status        TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
    submitted_by  INTEGER REFERENCES users(id),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    spot_id      INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    status       TEXT NOT NULL,                       -- 'open' | 'closed'
    crowd        TEXT,                                -- 'low' | 'medium' | 'high'
    wait_minutes INTEGER,
    note         TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_spots_status ON spots(status);
  CREATE INDEX IF NOT EXISTS idx_reports_spot  ON reports(spot_id);
`);

// A live report older than this is considered stale.
export const STALE_AFTER_MS = 90 * 60 * 1000; // 90 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const nowUTC = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export function toISO(sqliteUtc) {
  if (!sqliteUtc) return null;
  return sqliteUtc.replace(' ', 'T') + 'Z';
}

/** Current time-of-day as 'HH:MM' in the user's timezone (Asia/Kolkata). */
export function currentHHMM() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function withinHours(opensAt, closesAt, hhmm = currentHHMM()) {
  return hhmm >= opensAt && hhmm <= closesAt;
}

/**
 * Resolve the live status of a spot from its latest report (if fresh) or its
 * opening hours (fallback). Returns a plain object for the API.
 */
export function resolveStatus(spot, latestReport) {
  let fresh = false;
  if (latestReport) {
    const age = Date.now() - Date.parse(toISO(latestReport.created_at));
    fresh = age <= STALE_AFTER_MS;
  }
  if (fresh) {
    return {
      live: true,
      open: latestReport.status === 'open',
      crowd: latestReport.crowd ?? null,
      wait_minutes: latestReport.wait_minutes ?? null,
      note: latestReport.note ?? null,
      source: 'report',
      updated_at: toISO(latestReport.created_at),
      updated_by: latestReport.user_name ?? null,
    };
  }
  // Fall back to opening hours when no fresh report exists.
  const inHours = withinHours(spot.opens_at, spot.closes_at);
  return {
    live: false,
    open: inHours,
    crowd: null,
    wait_minutes: null,
    note: latestReport ? 'Last report is old — check with the spot before heading.' : null,
    source: latestReport ? 'stale-report' : 'hours',
    updated_at: toISO(latestReport?.created_at ?? null),
    updated_by: null,
  };
}

/** Attach the resolved status object to each spot row (selects latest report). */
export function withStatus(spots) {
  if (!spots.length) return [];
  const ids = spots.map((s) => s.id);
  const ph = ids.map(() => '?').join(',');
  const latest = db
    .prepare(
      `SELECT r.*, u.name AS user_name
         FROM reports r
         JOIN users u ON u.id = r.user_id
         JOIN (SELECT spot_id, MAX(id) AS max_id FROM reports GROUP BY spot_id) t
           ON t.max_id = r.id
        WHERE r.spot_id IN (${ph})`
    )
    .all(...ids);
  const bySpot = Object.fromEntries(latest.map((r) => [r.spot_id, r]));
  return spots.map((s) => ({
    ...s,
    status: resolveStatus(s, bySpot[s.id] ?? null),
  }));
}

export const publicUser = (u) =>
  u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
