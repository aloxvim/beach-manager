const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/", (req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY name").all());
});

router.get("/all", (req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM products ORDER BY name").all());
});

router.post("/", (req, res) => {
  const db = getDb();
  const { name, price } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: "Nombre y precio requeridos" });
  const result = db.prepare("INSERT INTO products (name, price) VALUES (?, ?)").run(name, price);
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const db = getDb();
  const { name, price, active } = req.body;
  db.prepare("UPDATE products SET name = COALESCE(?, name), price = COALESCE(?, price), active = COALESCE(?, active) WHERE id = ?")
    .run(name ?? null, price ?? null, active ?? null, req.params.id);
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
