const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SECRET } = require("../middleware/auth");

const router = express.Router();

// Hash de la contraseña en memoria al arrancar
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Contraseña requerida" });

  const valid = bcrypt.compareSync(password, PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

  const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "12h" });
  res.json({ token });
});

module.exports = router;
