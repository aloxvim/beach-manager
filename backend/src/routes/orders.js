const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const UMBRELLA_MIN = 500;
const UMBRELLA_MAX = 539;
const BALINESE_FROM = 531;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function withItems(order) {
  const db = getDb();
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at").all(order.id);
  return { ...order, items };
}

// GET /orders?date=YYYY-MM-DD
router.get("/", (req, res) => {
  const db = getDb();
  const date = req.query.date || today();
  const orders = db.prepare("SELECT * FROM orders WHERE date = ? ORDER BY umbrella_num, created_at").all(date);
  res.json(orders.map(withItems));
});

// POST /orders — abrir nueva comanda
router.post("/", (req, res) => {
  const db = getDb();
  const {
    umbrella_num, client_name, status,
    standard_beds, balinese_beds, balinese_price,
    standard_price, notes, date,
  } = req.body;

  const d = date || today();
  const num = parseInt(umbrella_num);
  if (isNaN(num) || num < UMBRELLA_MIN || num > UMBRELLA_MAX) {
    return res.status(400).json({ error: `Número de sombrilla debe ser ${UMBRELLA_MIN}-${UMBRELLA_MAX}` });
  }

  const isBalinese = num >= BALINESE_FROM;
  const sp = standard_price ?? 6;

  const result = db.prepare(`
    INSERT INTO orders (date, umbrella_num, client_name, status, standard_beds, balinese_beds,
      balinese_price, standard_price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(d, num, client_name || null, status || "pending",
    standard_beds || 0, balinese_beds || 0,
    balinese_price || null, sp, notes || null);

  res.json(withItems(db.prepare("SELECT * FROM orders WHERE id = ?").get(result.lastInsertRowid)));
});

// PATCH /orders/:id — editar comanda
router.patch("/:id", (req, res) => {
  const db = getDb();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "No encontrado" });

  const fields = [
    "client_name", "status", "standard_beds", "balinese_beds",
    "balinese_price", "standard_price", "refund_amount", "refund_note", "notes",
  ];
  const updates = [];
  const values = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  });
  if (!updates.length) return res.json(withItems(order));

  values.push(req.params.id);
  db.prepare(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  res.json(withItems(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id)));
});

// POST /orders/:id/close — cerrar turno conservando ingresos
router.post("/:id/close", (req, res) => {
  const db = getDb();
  db.prepare("UPDATE orders SET closed = 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// DELETE /orders/:id — anular comanda (sin cargo)
router.delete("/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// POST /orders/:id/items — añadir consumición
router.post("/:id/items", (req, res) => {
  const db = getDb();
  const { product_id, name, price, qty } = req.body;
  const result = db.prepare(
    "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)"
  ).run(req.params.id, product_id || null, name, price, qty || 1);
  res.json(db.prepare("SELECT * FROM order_items WHERE id = ?").get(result.lastInsertRowid));
});

// DELETE /orders/:id/items/:iid
router.delete("/:id/items/:iid", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM order_items WHERE id = ? AND order_id = ?").run(req.params.iid, req.params.id);
  res.json({ ok: true });
});

// GET /orders/summary?date=YYYY-MM-DD
router.get("/summary", (req, res) => {
  const db = getDb();
  const date = req.query.date || today();

  const orders = db.prepare(`
    SELECT * FROM orders WHERE date = ? AND status != 'reserved'
  `).all(date);

  const items = db.prepare(`
    SELECT oi.* FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.date = ? AND o.status != 'reserved'
  `).all(date);

  let totalBeds = 0;
  let grossBeds = 0;
  let totalRefunds = 0;
  let totalItems = 0;
  let guestCount = 0;

  orders.forEach((o) => {
    if (o.status === "guest") { guestCount++; return; }
    totalBeds += o.standard_beds + o.balinese_beds;
    grossBeds += (o.standard_beds * o.standard_price) + (o.balinese_beds > 0 ? (o.balinese_price || 0) : 0);
    totalRefunds += o.refund_amount || 0;
  });

  items.forEach((i) => { totalItems += i.price * i.qty; });

  const netBeds = grossBeds - totalRefunds;
  const totalIncome = netBeds + totalItems;

  res.json({
    date, totalOrders: orders.length, totalBeds,
    grossBeds, totalRefunds, netBeds,
    totalItems, totalIncome, guestCount,
    orders: orders.map(withItems),
  });
});

// GET /orders/history
router.get("/history", (req, res) => {
  const db = getDb();
  const days = db.prepare(`
    SELECT date,
      COUNT(*) as orders,
      SUM(CASE WHEN status != 'guest' AND status != 'reserved'
        THEN (standard_beds * standard_price) + COALESCE(balinese_price, 0) - COALESCE(refund_amount, 0)
        ELSE 0 END) as net_beds
    FROM orders
    GROUP BY date
    ORDER BY date DESC
    LIMIT 60
  `).all();
  res.json(days);
});

module.exports = router;