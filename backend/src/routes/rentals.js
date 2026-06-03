const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

function today() {
  return new Date().toISOString().slice(0, 10);
}

// GET /rentals?date=YYYY-MM-DD  (default: hoy)
router.get("/", (req, res) => {
  const db = getDb();
  const date = req.query.date || today();
  const rentals = db.prepare(`
    SELECT r.*, 
      json_group_array(
        CASE WHEN ci.id IS NOT NULL THEN
          json_object('id', ci.id, 'name', ci.name, 'price', ci.price, 'qty', ci.qty)
        END
      ) as consumptions
    FROM rentals r
    LEFT JOIN consumption_items ci ON ci.rental_id = r.id
    WHERE r.date = ?
    GROUP BY r.id
  `).all(date);

  // Parsear consumptions JSON y filtrar nulls
  const parsed = rentals.map((r) => ({
    ...r,
    consumptions: JSON.parse(r.consumptions).filter(Boolean),
  }));

  res.json(parsed);
});

// POST /rentals — crear o actualizar alquiler (upsert por date+umbrella_id)
router.post("/", (req, res) => {
  const db = getDb();
  const { umbrella_id, client_name, price, status, date } = req.body;
  const d = date || today();

  const existing = db.prepare("SELECT * FROM rentals WHERE date = ? AND umbrella_id = ?").get(d, umbrella_id);

  let rental;
  if (existing) {
    db.prepare(`UPDATE rentals SET client_name = ?, price = ?, status = ?, checked_in_at = COALESCE(checked_in_at, datetime('now'))
                WHERE id = ?`).run(client_name, price, status || "occupied", existing.id);
    rental = db.prepare("SELECT * FROM rentals WHERE id = ?").get(existing.id);
  } else {
    const result = db.prepare(`INSERT INTO rentals (date, umbrella_id, client_name, price, status, checked_in_at)
                               VALUES (?, ?, ?, ?, ?, datetime('now'))`)
      .run(d, umbrella_id, client_name, price, status || "occupied");
    rental = db.prepare("SELECT * FROM rentals WHERE id = ?").get(result.lastInsertRowid);
  }
  res.json(rental);
});

// PATCH /rentals/:id — actualizar campos parcialmente
router.patch("/:id", (req, res) => {
  const db = getDb();
  const { status, client_name, price, refund_amount, refund_note } = req.body;
  const rental = db.prepare("SELECT * FROM rentals WHERE id = ?").get(req.params.id);
  if (!rental) return res.status(404).json({ error: "No encontrado" });

  const checked_out_at = status === "free" ? "datetime('now')" : null;

  db.prepare(`UPDATE rentals SET
    status        = COALESCE(?, status),
    client_name   = COALESCE(?, client_name),
    price         = COALESCE(?, price),
    refund_amount = COALESCE(?, refund_amount),
    refund_note   = COALESCE(?, refund_note),
    checked_out_at = CASE WHEN ? = 'free' THEN datetime('now') ELSE checked_out_at END
    WHERE id = ?`).run(status ?? null, client_name ?? null, price ?? null,
      refund_amount ?? null, refund_note ?? null, status ?? null, req.params.id);

  const updated = db.prepare(`
    SELECT r.*, json_group_array(
      CASE WHEN ci.id IS NOT NULL THEN
        json_object('id', ci.id, 'name', ci.name, 'price', ci.price, 'qty', ci.qty)
      END
    ) as consumptions
    FROM rentals r
    LEFT JOIN consumption_items ci ON ci.rental_id = r.id
    WHERE r.id = ?
    GROUP BY r.id
  `).get(req.params.id);

  res.json({ ...updated, consumptions: JSON.parse(updated.consumptions).filter(Boolean) });
});

// POST /rentals/:id/reserve — marcar como reservada
router.post("/:id/reserve", (req, res) => {
  const db = getDb();
  const { umbrella_id, client_name, price, date } = req.body;
  const d = date || today();

  const existing = db.prepare("SELECT * FROM rentals WHERE date = ? AND umbrella_id = ?").get(d, umbrella_id);
  let rental;
  if (existing) {
    db.prepare("UPDATE rentals SET status = 'reserved', client_name = ? WHERE id = ?").run(client_name, existing.id);
    rental = db.prepare("SELECT * FROM rentals WHERE id = ?").get(existing.id);
  } else {
    const result = db.prepare("INSERT INTO rentals (date, umbrella_id, client_name, price, status) VALUES (?, ?, ?, ?, 'reserved')")
      .run(d, umbrella_id, client_name, price);
    rental = db.prepare("SELECT * FROM rentals WHERE id = ?").get(result.lastInsertRowid);
  }
  res.json(rental);
});

// POST /rentals/:id/checkin — reserva → ocupada
router.post("/:id/checkin", (req, res) => {
  const db = getDb();
  db.prepare("UPDATE rentals SET status = 'occupied', checked_in_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json(db.prepare("SELECT * FROM rentals WHERE id = ?").get(req.params.id));
});

// POST /rentals/:id/checkout — cierra turno, conserva ingresos, libera para siguiente cliente
router.post("/:id/checkout", (req, res) => {
  const db = getDb();
  const rental = db.prepare("SELECT * FROM rentals WHERE id = ?").get(req.params.id);
  if (!rental) return res.status(404).json({ error: "No encontrado" });

  db.prepare(`UPDATE rentals SET status = 'done', checked_out_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);

  res.json({ ok: true });
});

// POST /rentals/:id/consumptions — añadir consumición
router.post("/:id/consumptions", (req, res) => {
  const db = getDb();
  const { product_id, name, price, qty } = req.body;
  const result = db.prepare("INSERT INTO consumption_items (rental_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)")
    .run(req.params.id, product_id || null, name, price, qty || 1);
  res.json(db.prepare("SELECT * FROM consumption_items WHERE id = ?").get(result.lastInsertRowid));
});

// DELETE /rentals/:id/consumptions/:cid
router.delete("/:id/consumptions/:cid", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM consumption_items WHERE id = ? AND rental_id = ?").run(req.params.cid, req.params.id);
  res.json({ ok: true });
});

// GET /rentals/summary?date=YYYY-MM-DD
router.get("/summary", (req, res) => {
  const db = getDb();
  const date = req.query.date || today();

  const rentals = db.prepare("SELECT * FROM rentals WHERE date = ? AND status != 'free'").all(date);
  const consumptions = db.prepare(`
    SELECT ci.* FROM consumption_items ci
    JOIN rentals r ON r.id = ci.rental_id
    WHERE r.date = ?
  `).all(date);

  const totalRentals = rentals.length;
  const grossRentals = rentals.reduce((s, r) => s + r.price, 0);
  const totalRefunds = rentals.reduce((s, r) => s + (r.refund_amount || 0), 0);
  const netRentals = grossRentals - totalRefunds;
  const totalConsumptions = consumptions.reduce((s, c) => s + c.price * c.qty, 0);
  const totalIncome = netRentals + totalConsumptions;

  res.json({
    date,
    totalRentals,
    grossRentals,
    totalRefunds,
    netRentals,
    totalConsumptions,
    totalIncome,
    rentals,
    consumptions,
  });
});

// GET /rentals/history — días con actividad
router.get("/history", (req, res) => {
  const db = getDb();
  const days = db.prepare(`
    SELECT date,
      COUNT(*) as rentals,
      SUM(price) - SUM(COALESCE(refund_amount,0)) as net_rentals
    FROM rentals
    WHERE status != 'free'
    GROUP BY date
    ORDER BY date DESC
    LIMIT 60
  `).all();
  res.json(days);
});

module.exports = router;
