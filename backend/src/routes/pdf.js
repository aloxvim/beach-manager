const express = require("express");
const PDFDocument = require("pdfkit");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/summary/:date", (req, res) => {
  const db = getDb();
  const { date } = req.params;

  const settings = Object.fromEntries(
    db.prepare("SELECT key, value FROM settings").all().map((r) => [r.key, r.value])
  );

  const rentals = db.prepare(`
    SELECT r.*, json_group_array(
      CASE WHEN ci.id IS NOT NULL THEN
        json_object('name', ci.name, 'price', ci.price, 'qty', ci.qty)
      END
    ) as consumptions
    FROM rentals r
    LEFT JOIN consumption_items ci ON ci.rental_id = r.id
    WHERE r.date = ? AND r.status != 'free'
    GROUP BY r.id
    ORDER BY r.umbrella_id
  `).all(date);

  const parsed = rentals.map((r) => ({
    ...r,
    consumptions: JSON.parse(r.consumptions).filter(Boolean),
  }));

  const grossRentals = parsed.reduce((s, r) => s + r.price, 0);
  const totalRefunds = parsed.reduce((s, r) => s + (r.refund_amount || 0), 0);
  const netRentals = grossRentals - totalRefunds;
  const totalConsumptions = parsed.reduce(
    (s, r) => s + r.consumptions.reduce((cs, c) => cs + c.price * c.qty, 0), 0
  );
  const totalIncome = netRentals + totalConsumptions;

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="resumen-${date}.pdf"`);
  doc.pipe(res);

  // Cabecera
  doc.fontSize(20).font("Helvetica-Bold").text(settings.beach_name || "Playa", { align: "center" });
  doc.fontSize(12).font("Helvetica").text(`Resumen del día: ${date}`, { align: "center" });
  doc.moveDown(1.5);

  // Resumen global
  doc.fontSize(14).font("Helvetica-Bold").text("Resumen general");
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica");
  doc.text(`Tumbonas alquiladas: ${parsed.length}`);
  doc.text(`Ingresos brutos alquiler: ${grossRentals.toFixed(2)} €`);
  if (totalRefunds > 0) doc.text(`Reembolsos: -${totalRefunds.toFixed(2)} €`);
  doc.text(`Ingresos netos alquiler: ${netRentals.toFixed(2)} €`);
  doc.text(`Ingresos consumiciones: ${totalConsumptions.toFixed(2)} €`);
  doc.moveDown(0.3);
  doc.fontSize(13).font("Helvetica-Bold").text(`TOTAL: ${totalIncome.toFixed(2)} €`);
  doc.moveDown(1.5);

  // Detalle por tumbona
  doc.fontSize(14).font("Helvetica-Bold").text("Detalle por tumbona");
  doc.moveDown(0.5);

  parsed.forEach((r) => {
    const consumTotal = r.consumptions.reduce((s, c) => s + c.price * c.qty, 0);
    doc.fontSize(11).font("Helvetica-Bold").text(`${r.umbrella_id} — ${r.client_name || "Sin nombre"}`);
    doc.font("Helvetica").fontSize(10);
    doc.text(`  Alquiler: ${r.price.toFixed(2)} €${r.refund_amount ? ` (reembolso: -${r.refund_amount.toFixed(2)} €)` : ""}`);
    if (r.consumptions.length > 0) {
      r.consumptions.forEach((c) => {
        doc.text(`  · ${c.name} x${c.qty}: ${(c.price * c.qty).toFixed(2)} €`);
      });
    }
    if (consumTotal > 0) doc.text(`  Subtotal consumiciones: ${consumTotal.toFixed(2)} €`);
    doc.text(`  Subtotal tumbona: ${(r.price - (r.refund_amount || 0) + consumTotal).toFixed(2)} €`);
    doc.moveDown(0.5);
  });

  doc.end();
});

module.exports = router;
