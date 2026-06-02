const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/", (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json(settings);
});

router.put("/:key", (req, res) => {
  const db = getDb();
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: "Valor requerido" });
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
  res.json({ key, value });
});

module.exports = router;
