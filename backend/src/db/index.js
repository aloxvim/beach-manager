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
    -- Configuración general
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Productos / carta de consumiciones
    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      price      REAL NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sombrillas extra (las 30 base se generan dinámicamente)
    CREATE TABLE IF NOT EXISTS extra_umbrellas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      label      TEXT NOT NULL,
      position   TEXT NOT NULL,  -- 'left' | 'right' (de la fila)
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Alquileres de tumbona (un registro por tumbona por día)
    CREATE TABLE IF NOT EXISTS rentals (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL,           -- YYYY-MM-DD
      umbrella_id     TEXT NOT NULL,           -- 'R1-U3-L' etc.
      client_name     TEXT,
      price           REAL NOT NULL DEFAULT 5,
      status          TEXT NOT NULL DEFAULT 'free', -- free | reserved | occupied
      checked_in_at   TEXT,
      checked_out_at  TEXT,
      refund_amount   REAL,
      refund_note     TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, umbrella_id)
    );

    -- Consumiciones ligadas a un alquiler
    CREATE TABLE IF NOT EXISTS consumption_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id  INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      name       TEXT NOT NULL,   -- snapshot del nombre en el momento
      price      REAL NOT NULL,   -- snapshot del precio
      qty        INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Valores por defecto
    INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_price', '5');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('beach_name', 'Playa');

    -- Productos de ejemplo (se pueden editar/borrar)
    INSERT OR IGNORE INTO products (id, name, price) VALUES (1, 'Agua', 1.50);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (2, 'Refresco', 2.00);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (3, 'Cerveza', 2.50);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (4, 'Café', 1.50);
    INSERT OR IGNORE INTO products (id, name, price) VALUES (5, 'Helado', 2.00);
  `);
}

module.exports = { getDb };
