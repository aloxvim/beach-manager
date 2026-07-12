const express = require("express");
const PDFDocument = require("pdfkit");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const STATUS_LABEL = {
  reserved: "Reservado", pending: "Pendiente", paid: "Pagado",
  paid_table: "Pagado en mesa", guest: "Invitado",
};

router.get("/summary/:date", (req, res) => {
  const db = getDb();
  const { date } = req.params;

  const settings = Object.fromEntries(
    db.prepare("SELECT key, value FROM settings").all().map((r) => [r.key, r.value])
  );

  const orders = db.prepare("SELECT * FROM orders WHERE date = ? ORDER BY umbrella_num, created_at").all(date);
  const enriched = orders.map((o) => ({
    ...o,
    items: db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(o.id),
  }));

  let grossBeds = 0, totalRefunds = 0, totalItems = 0, guestCount = 0;
  enriched.forEach((o) => {
    if (o.status === "guest") { guestCount++; return; }
    if (o.status === "reserved") return;
    grossBeds += (o.standard_beds * o.standard_price) + (o.balinese_beds > 0 ? (o.balinese_price || 0) : 0);
    totalRefunds += o.refund_amount || 0;
    o.items.forEach((i) => { totalItems += i.price * i.qty; });
  });
  const totalIncome = grossBeds - totalRefunds + totalItems;

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="resumen-${date}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text(settings.beach_name || "Playa", { align: "center" });
  doc.fontSize(12).font("Helvetica").text(`Resumen del día: ${date}`, { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(14).font("Helvetica-Bold").text("Resumen general");
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica");
  doc.text(`Comandas: ${enriched.length} (${guestCount} invitados)`);
  doc.text(`Ingresos brutos tumbonas: ${grossBeds.toFixed(2)} €`);
  if (totalRefunds > 0) doc.text(`Reembolsos: -${totalRefunds.toFixed(2)} €`);
  doc.text(`Ingresos consumiciones: ${totalItems.toFixed(2)} €`);
  doc.moveDown(0.3);
  doc.fontSize(13).font("Helvetica-Bold").text(`TOTAL: ${totalIncome.toFixed(2)} €`);
  doc.moveDown(1.5);

  doc.fontSize(14).font("Helvetica-Bold").text("Detalle por sombrilla");
  doc.moveDown(0.5);

  enriched.forEach((o) => {
    const itemsTotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
    const bedsTotal = o.status === "guest" ? 0 :
      (o.standard_beds * o.standard_price) + (o.balinese_beds > 0 ? (o.balinese_price || 0) : 0);
    const net = bedsTotal - (o.refund_amount || 0) + itemsTotal;

    doc.fontSize(11).font("Helvetica-Bold")
      .text(`Sombrilla ${o.umbrella_num} — ${o.client_name || "Sin nombre"} [${STATUS_LABEL[o.status] || o.status}]`);
    doc.font("Helvetica").fontSize(10);
    if (o.standard_beds > 0) doc.text(`  Tumbonas: ${o.standard_beds} × ${o.standard_price.toFixed(2)} € = ${(o.standard_beds * o.standard_price).toFixed(2)} €`);
    if (o.balinese_beds > 0) doc.text(`  Balinesas: ${o.balinese_beds} × precio acordado = ${(o.balinese_price || 0).toFixed(2)} €`);
    if (o.refund_amount > 0) doc.text(`  Reembolso: -${o.refund_amount.toFixed(2)} € (${o.refund_note || ""})`);
    o.items.forEach((i) => doc.text(`  · ${i.name} x${i.qty}: ${(i.price * i.qty).toFixed(2)} €`));
    if (o.status !== "guest") doc.text(`  Subtotal: ${net.toFixed(2)} €`);
    if (o.notes) doc.text(`  Nota: ${o.notes}`);
    doc.moveDown(0.5);
  });

  doc.end();
});

module.exports = router;