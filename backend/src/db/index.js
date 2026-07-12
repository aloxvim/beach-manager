const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/beach.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      price      REAL NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cada fila = un turno de una sombrilla en un día
    -- Una misma sombrilla puede tener varios turnos en el mismo día
    CREATE TABLE IF NOT EXISTS orders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      umbrella_num  INTEGER NOT NULL,
      client_name   TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      -- status: reserved | pending | paid | paid_table | guest
      standard_beds INTEGER NOT NULL DEFAULT 0,   -- tumbonas normales
      balinese_beds INTEGER NOT NULL DEFAULT 0,   -- balinesas
      balinese_price REAL,                         -- precio libre de balinesas
      standard_price REAL NOT NULL DEFAULT 6,     -- precio por tumbona normal
      refund_amount REAL,
      refund_note   TEXT,
      notes         TEXT,
      closed        INTEGER NOT NULL DEFAULT 0,   -- 1 = turno cerrado, libre para siguiente
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      name       TEXT NOT NULL,
      price      REAL NOT NULL,
      qty        INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('standard_price', '6');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('beach_name', 'Playa');

    INSERT OR IGNORE INTO products (id, name, price) VALUES (1, 'Agua', 1.50);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (2, 'Refresco', 2.00);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (3, 'Cerveza', 2.50);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (4, 'Café', 1.50);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (5, 'Helado', 2.00);
  `);

}

module.exports = { getDb };