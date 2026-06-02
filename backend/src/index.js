const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const productsRoutes = require("./routes/products");
const rentalsRoutes = require("./routes/rentals");
const pdfRoutes = require("./routes/pdf");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/rentals", rentalsRoutes);
app.use("/api/pdf", pdfRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Beach Manager backend escuchando en :${PORT}`);
});
