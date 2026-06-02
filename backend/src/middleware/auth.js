const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret";

function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No autorizado" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { authMiddleware, SECRET };
