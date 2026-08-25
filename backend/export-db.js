// Export the LunchRadar database as files you can open or import anywhere.
//
//   node export-db.js            → writes ../lunchradar.db  +  the three .sql dumps
//   node export-db.js <dir>      → writes into <dir> instead
//
// Output:
//   lunchradar.db           — binary SQLite (DB Browser for SQLite, VS Code SQLite Viewer)
//   lunchradar.sql          — SQLite text dump (schema + rows)
//   lunchradar-mysql.sql    — MySQL / MariaDB dump
//   lunchradar-postgres.sql — PostgreSQL dump
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// Step 1 — merge WAL into the main file, verify integrity
// ---------------------------------------------------------------------------
db.pragma('wal_checkpoint(TRUNCATE)');
const integrity = db.prepare('PRAGMA integrity_check').get();
if (integrity?.integrity_check !== 'ok') {
  console.error('❌ Integrity check failed:', integrity);
  process.exit(1);
}

const srcDb = path.join(__dirname, 'data', 'lunchradar.db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TABLES = [
  { name: 'users',   order: 1 }, // users first (spots/reports reference it)
  { name: 'spots',   order: 2 },
  { name: 'reports', order: 3 },
];

const cols = (t) => db.prepare(`SELECT name, type FROM pragma_table_info(?)`).all(t);

const rowsOf = (t) => db.prepare(`SELECT * FROM ${t}`).all();

// Escape a JS value as a SQL literal.
const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const rowValues = (r, c) => c.map((k) => esc(r[k.name])).join(', ');

// ---------------------------------------------------------------------------
// Step 2 — binary SQLite copy
// ---------------------------------------------------------------------------
const dbFile = path.join(outDir, 'lunchradar.db');
fs.copyFileSync(srcDb, dbFile);

// ---------------------------------------------------------------------------
// Step 3 — SQLite text dump
// ---------------------------------------------------------------------------
function sqliteDump() {
  let o = `-- LunchRadar database dump (SQLite)\n-- Generated: ${new Date().toISOString()}\n\nPRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n`;
  for (const { name: t } of TABLES) {
    const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(t);
    o += `${sql?.sql || ''};\n\n`;
    const c = cols(t);
    for (const r of rowsOf(t)) {
      o += `INSERT INTO ${t} (${c.map((x) => x.name).join(', ')}) VALUES (${rowValues(r, c)});\n`;
    }
    o += '\n';
  }
  o += 'COMMIT;\n';
  return o;
}

// ---------------------------------------------------------------------------
// Step 4 — MySQL / MariaDB dump
// ---------------------------------------------------------------------------
function mysqlType(t) {
  const upper = (t || '').toUpperCase();
  const map = [
    ['TEXT', 'TEXT'],
    ['DATETIME', 'DATETIME'],
  ];
  if (upper.includes('INT')) return 'INT';
  return t || 'TEXT';
}

function mysqlDump() {
  let o = `-- LunchRadar database dump (MySQL / MariaDB)\n-- Generated: ${new Date().toISOString()}\n-- Import:  mysql -u root -p lunchradar < lunchradar-mysql.sql\n\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSTART TRANSACTION;\n\n`;
  for (const { name: t } of TABLES.slice().reverse()) {
    o += `DROP TABLE IF EXISTS ${t};\n`;
  }
  o += '\n';

  o += `CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  o += `CREATE TABLE spots (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
  description VARCHAR(500) NOT NULL DEFAULT '',
  area VARCHAR(120) NOT NULL DEFAULT '',
  cuisine VARCHAR(60) NOT NULL DEFAULT 'South Indian',
  price INT NOT NULL DEFAULT 1,
  veg VARCHAR(10) NOT NULL DEFAULT 'both',
  walk_minutes INT NOT NULL DEFAULT 15,
  opens_at CHAR(5) NOT NULL DEFAULT '11:00',
  closes_at CHAR(5) NOT NULL DEFAULT '15:30',
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  submitted_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_spots_submitter FOREIGN KEY (submitted_by) REFERENCES users(id),
  INDEX idx_spots_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  o += `CREATE TABLE reports (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  spot_id INT NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(10) NOT NULL,
  crowd VARCHAR(10) NULL,
  wait_minutes INT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_spot FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_reports_spot (spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  for (const { name: t } of TABLES) {
    const c = cols(t);
    for (const r of rowsOf(t)) {
      o += `INSERT INTO ${t} (${c.map((x) => x.name).join(', ')}) VALUES (${rowValues(r, c)});\n`;
    }
    o += '\n';
  }

  o += `COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  return o;
}

// ---------------------------------------------------------------------------
// Step 5 — PostgreSQL dump
// ---------------------------------------------------------------------------
function postgresDump() {
  let o = `-- LunchRadar database dump (PostgreSQL)\n-- Generated: ${new Date().toISOString()}\n-- Import:  createdb lunchradar && psql lunchradar < lunchradar-postgres.sql\n\nSET client_encoding = 'UTF8';\n\n`;
  for (const { name: t } of TABLES.slice().reverse()) {
    o += `DROP TABLE IF EXISTS ${t} CASCADE;\n`;
  }
  o += '\n';

  o += `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);\n\n`;

  o += `CREATE TABLE spots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  description TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  cuisine TEXT NOT NULL DEFAULT 'South Indian',
  price INTEGER NOT NULL DEFAULT 1,
  veg TEXT NOT NULL DEFAULT 'both',
  walk_minutes INTEGER NOT NULL DEFAULT 15,
  opens_at TEXT NOT NULL DEFAULT '11:00',
  closes_at TEXT NOT NULL DEFAULT '15:30',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);\nCREATE INDEX idx_spots_status ON spots(status);\n\n`;

  o += `CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  crowd TEXT,
  wait_minutes INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);\nCREATE INDEX idx_reports_spot ON reports(spot_id);\n\n`;

  for (const { name: t } of TABLES) {
    const c = cols(t);
    for (const r of rowsOf(t)) {
      o += `INSERT INTO ${t} (${c.map((x) => x.name).join(', ')}) VALUES (${rowValues(r, c)});\n`;
    }
    o += '\n';
  }
  return o;
}

// ---------------------------------------------------------------------------
// Write everything
// ---------------------------------------------------------------------------
const files = [
  ['lunchradar.db', fs.readFileSync(srcDb), 'binary'],
  ['lunchradar.sql', sqliteDump(), 'text'],
  ['lunchradar-mysql.sql', mysqlDump(), 'text'],
  ['lunchradar-postgres.sql', postgresDump(), 'text'],
];

for (const [name, content] of files) {
  fs.writeFileSync(path.join(outDir, name), content);
  const size = (Buffer.byteLength(content) / 1024).toFixed(0);
  console.log(`✅ ${name.padEnd(26)} ${size} KB`);
}
console.log('\nOpen with: DB Browser for SQLite, MySQL Workbench, pgAdmin, DBeaver…');
