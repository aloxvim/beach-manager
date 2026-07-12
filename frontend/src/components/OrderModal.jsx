import { useState } from "react";
import { api } from "../api";

const STATUS_OPTIONS = [
  { value: "reserved",   label: "Reservado",       color: "bg-amber-800" },
  { value: "pending",    label: "Pendiente",        color: "bg-red-900" },
  { value: "paid",       label: "Pagado",           color: "bg-ocean-700" },
  { value: "paid_table", label: "Pagado en mesa",   color: "bg-green-900" },
  { value: "guest",      label: "Invitado",         color: "bg-purple-900" },
];

function isBalinese(num) { return num >= 531; }

export default function OrderModal({ num, order, settings, products, onClose }) {
  const isNew = !order;
  const balinese = isBalinese(num);

  const [clientName, setClientName] = useState(order?.client_name || "");
  const [status, setStatus] = useState(order?.status || "pending");
  const [standardBeds, setStandardBeds] = useState(order?.standard_beds ?? (balinese ? 0 : 1));
  const [standardPrice, setStandardPrice] = useState(order?.standard_price ?? parseFloat(settings.standard_price ?? 6));
  const [balineseCount, setBalineseCount] = useState(order?.balinese_beds ?? (balinese ? 1 : 0));
  const [balinesePrice, setBalinesePrice] = useState(order?.balinese_price ?? "");
  const [notes, setNotes] = useState(order?.notes || "");
  const [refundAmount, setRefundAmount] = useState(order?.refund_amount ?? "");
  const [refundNote, setRefundNote] = useState(order?.refund_note || "");
  const [view, setView] = useState("main"); // main | items | refund | status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = order?.items || [];
  const bedsTotal = status === "guest" ? 0 :
    (standardBeds * standardPrice) + (balineseCount > 0 ? (parseFloat(balinesePrice) || 0) : 0);
  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const refund = parseFloat(refundAmount) || 0;
  const grandTotal = bedsTotal - refund + itemsTotal;

  const maxRefund = bedsTotal + itemsTotal;

  async function handleSave() {
    setLoading(true); setError("");
    try {
      const data = {
        client_name: clientName || null,
        status,
        standard_beds: standardBeds,
        standard_price: standardPrice,
        balinese_beds: balineseCount,
        balinese_price: balineseCount > 0 ? parseFloat(balinesePrice) || null : null,
        notes: notes || null,
        refund_amount: refund || null,
        refund_note: refundNote || null,
      };
      if (isNew) {
        await api.createOrder({ ...data, umbrella_num: num });
      } else {
        await api.updateOrder(order.id, data);
      }
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleClose() {
    if (!confirm("¿Cerrar turno? La sombrilla quedará libre para otro cliente. Los ingresos se conservan.")) return;
    setLoading(true);
    try {
      // Save current state first, then close
      await api.updateOrder(order.id, {
        client_name: clientName || null, status,
        standard_beds: standardBeds, standard_price: standardPrice,
        balinese_beds: balineseCount,
        balinese_price: balineseCount > 0 ? parseFloat(balinesePrice) || null : null,
        refund_amount: refund || null, refund_note: refundNote || null, notes: notes || null,
      });
      await api.closeOrder(order.id);
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!confirm("¿Anular esta comanda? No se registrará ningún ingreso.")) return;
    setLoading(true);
    try {
      await api.deleteOrder(order.id);
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function addItem(product) {
    setLoading(true);
    try {
      await api.addItem(order.id, { product_id: product.id, name: product.name, price: product.price, qty: 1 });
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function removeItem(iid) {
    setLoading(true);
    try {
      await api.deleteItem(order.id, iid);
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  const icon = balinese ? "🛏️" : "☂️";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => onClose(false)}>
      <div className="bg-ocean-800 w-full max-w-lg rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">{icon} Sombrilla {num}</h2>
          <button onClick={() => onClose(false)} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3 bg-red-900/30 rounded-lg px-3 py-2">{error}</p>}

        {/* ── MAIN ── */}
        {view === "main" && (
          <div className="space-y-4">

            {/* Estado */}
            <div>
              <label className="text-xs text-gray-400 font-medium">ESTADO</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      status === s.value
                        ? `${s.color} border-white/30 text-white`
                        : "bg-ocean-900 border-ocean-700 text-gray-400"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="text-xs text-gray-400 font-medium">CLIENTE</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder={status === "reserved" ? "Nombre de reserva" : "Nombre (opcional)"}
                className="w-full mt-1.5 bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-sand-400" />
            </div>

            {/* Tumbonas */}
            {status !== "guest" && (
              <div className="bg-ocean-900 rounded-xl p-3 space-y-3">
                <label className="text-xs text-gray-400 font-medium">TUMBONAS</label>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">☂️ Normales</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStandardBeds(Math.max(0, standardBeds - 1))}
                      className="w-8 h-8 rounded-lg bg-ocean-800 text-white font-bold text-lg flex items-center justify-center">−</button>
                    <span className="text-white font-bold w-6 text-center">{standardBeds}</span>
                    <button onClick={() => setStandardBeds(standardBeds + 1)}
                      className="w-8 h-8 rounded-lg bg-ocean-800 text-white font-bold text-lg flex items-center justify-center">+</button>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-gray-400 text-xs">a</span>
                      <input type="number" step="0.5" min="0" value={standardPrice}
                        onChange={(e) => setStandardPrice(parseFloat(e.target.value) || 0)}
                        className="w-16 bg-ocean-800 border border-ocean-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-sand-400" />
                      <span className="text-gray-400 text-xs">€</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">🛏️ Balinesas</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setBalineseCount(Math.max(0, balineseCount - 1))}
                      className="w-8 h-8 rounded-lg bg-ocean-800 text-white font-bold text-lg flex items-center justify-center">−</button>
                    <span className="text-white font-bold w-6 text-center">{balineseCount}</span>
                    <button onClick={() => setBalineseCount(balineseCount + 1)}
                      className="w-8 h-8 rounded-lg bg-ocean-800 text-white font-bold text-lg flex items-center justify-center">+</button>
                    {balineseCount > 0 && (
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-gray-400 text-xs">total</span>
                        <input type="number" step="0.5" min="0"
                          value={balinesePrice}
                          onChange={(e) => setBalinesePrice(e.target.value)}
                          placeholder="€"
                          className="w-16 bg-ocean-800 border border-ocean-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-sand-400" />
                        <span className="text-gray-400 text-xs">€</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-ocean-700 pt-2 flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal tumbonas</span>
                  <span className="text-white font-medium">{bedsTotal.toFixed(2)} €</span>
                </div>
              </div>
            )}

            {/* Consumiciones */}
            {!isNew && items.length > 0 && (
              <div className="bg-ocean-900 rounded-xl p-3">
                <label className="text-xs text-gray-400 font-medium">CONSUMICIONES</label>
                <div className="mt-2 space-y-1">
                  {items.map((i) => (
                    <div key={i.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{i.name} x{i.qty}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{(i.price * i.qty).toFixed(2)} €</span>
                        <button onClick={() => removeItem(i.id)} className="text-red-400 text-lg leading-none">×</button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-ocean-700 pt-1 flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal consumiciones</span>
                    <span className="text-white font-medium">{itemsTotal.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reembolso */}
            {!isNew && (order?.refund_amount > 0 || view === "main") && (
              <div className="bg-ocean-900 rounded-xl p-3 space-y-2">
                <label className="text-xs text-gray-400 font-medium">REEMBOLSO</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.5" min="0"
                    value={refundAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > maxRefund) return;
                      setRefundAmount(e.target.value);
                    }}
                    placeholder="0.00 €"
                    className="flex-1 bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sand-400" />
                  <input value={refundNote} onChange={(e) => setRefundNote(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="flex-1 bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-sand-400" />
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-xs text-gray-400 font-medium">NOTAS</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas (opcional)"
                className="w-full mt-1.5 bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-sand-400" />
            </div>

            {/* Total */}
            {status !== "guest" && (
              <div className="bg-ocean-700/40 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-gray-300 font-medium">TOTAL</span>
                <span className="text-sand-400 text-xl font-bold">{grandTotal.toFixed(2)} €</span>
              </div>
            )}

            {/* Acciones */}
            <div className="space-y-2 pt-1">
              {!isNew && (
                <button onClick={() => setView("items")}
                  className="w-full bg-sand-500 hover:bg-sand-400 text-ocean-900 font-bold py-3 rounded-xl">
                  🍺 Añadir consumición
                </button>
              )}
              <button onClick={handleSave} disabled={loading}
                className="w-full bg-ocean-600 hover:bg-ocean-500 text-white font-bold py-3 rounded-xl disabled:opacity-40">
                {loading ? "Guardando..." : isNew ? "Abrir comanda" : "Guardar cambios"}
              </button>
              {!isNew && (
                <>
                  <button onClick={handleClose} disabled={loading}
                    className="w-full bg-green-900 hover:bg-green-800 text-white py-3 rounded-xl font-medium">
                    🚪 Cerrar turno (conservar ingresos)
                  </button>
                  <button onClick={handleDelete} disabled={loading}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-2.5 rounded-xl text-sm">
                    🗑️ Anular comanda
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CONSUMICIONES ── */}
        {view === "items" && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">Añadir consumición</h3>
            {products.length === 0 && (
              <p className="text-gray-400 text-sm">Sin productos configurados. Ve a Ajustes.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {products.map((p) => (
                <button key={p.id} onClick={() => addItem(p)} disabled={loading}
                  className="bg-ocean-900 border border-ocean-700 rounded-xl p-3 text-left hover:border-sand-400 transition-colors">
                  <div className="font-medium text-white text-sm">{p.name}</div>
                  <div className="text-sand-400 text-sm">{p.price.toFixed(2)} €</div>
                </button>
              ))}
            </div>
            <button onClick={() => setView("main")} className="w-full bg-gray-700 text-white py-2.5 rounded-xl">
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}