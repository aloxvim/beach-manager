import { useState } from "react";
import { api } from "../api";

export default function UmbrellaModal({ umbrella, rental, settings, products, onClose }) {
  const [view, setView] = useState("main"); // main | occupy | reserve | consumptions | refund
  const [clientName, setClientName] = useState(rental?.client_name || "");
  const [price, setPrice] = useState(rental?.price ?? parseFloat(settings.daily_price ?? 5));
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const status = rental?.status || "free";
  const today = new Date().toISOString().slice(0, 10);

  const consumptionsTotal = (rental?.consumptions || []).reduce(
    (s, c) => s + c.price * c.qty, 0
  );

  async function handleOccupy() {
    setLoading(true); setError("");
    try {
      await api.createRental({
        umbrella_id: umbrella.id,
        client_name: clientName,
        price,
        status: "occupied",
        date: today,
      });
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleReserve() {
    setLoading(true); setError("");
    try {
      await api.reserveUmbrella(null, {
        umbrella_id: umbrella.id,
        client_name: clientName,
        price,
        date: today,
      });
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleCheckin() {
    setLoading(true); setError("");
    try {
      await api.checkinRental(rental.id);
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleFree() {
    if (!confirm("¿Marcar esta tumbona como libre?")) return;
    setLoading(true); setError("");
    try {
      await api.updateRental(rental.id, { status: "free" });
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleRefund() {
    setLoading(true); setError("");
    try {
      await api.updateRental(rental.id, {
        refund_amount: parseFloat(refundAmount),
        refund_note: refundNote,
      });
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function addConsumption(product) {
    setLoading(true); setError("");
    try {
      await api.addConsumption(rental.id, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
      });
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function removeConsumption(cid) {
    setLoading(true); setError("");
    try {
      await api.deleteConsumption(rental.id, cid);
      onClose(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  const umbrellaLabel = umbrella.id.replace("R", "Fila ").replace("-U", " · Sombrilla ").replace("-L", " · Izquierda").replace("-R", " · Derecha");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => onClose(false)}>
      <div
        className="bg-ocean-800 w-full max-w-lg rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-white text-base">{umbrellaLabel}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status === "free" ? "bg-gray-700 text-gray-300" :
              status === "reserved" ? "bg-amber-800 text-amber-200" :
              "bg-ocean-700 text-ocean-200"
            }`}>
              {status === "free" ? "Libre" : status === "reserved" ? "Reservada" : "Ocupada"}
            </span>
          </div>
          <button onClick={() => onClose(false)} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3 bg-red-900/30 rounded-lg px-3 py-2">{error}</p>}

        {/* ── LIBRE ── */}
        {status === "free" && view === "main" && (
          <div className="space-y-3">
            <button onClick={() => setView("occupy")} className="w-full bg-ocean-700 hover:bg-ocean-600 text-white font-medium py-3 rounded-xl">
              👤 Ocupar ahora
            </button>
            <button onClick={() => setView("reserve")} className="w-full bg-amber-800 hover:bg-amber-700 text-white font-medium py-3 rounded-xl">
              📋 Reservar
            </button>
          </div>
        )}

        {/* ── FORMULARIO OCUPAR ── */}
        {status === "free" && view === "occupy" && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">Ocupar tumbona</h3>
            <input
              placeholder="Nombre del cliente (opcional)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-sand-400"
            />
            <div className="flex items-center gap-2">
              <label className="text-gray-300 text-sm whitespace-nowrap">Precio (€):</label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="flex-1 bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sand-400"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setView("main")} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Atrás</button>
              <button onClick={handleOccupy} disabled={loading} className="flex-1 bg-ocean-600 hover:bg-ocean-500 text-white font-bold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? "..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}

        {/* ── FORMULARIO RESERVAR ── */}
        {status === "free" && view === "reserve" && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">Reservar tumbona</h3>
            <input
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-sand-400"
            />
            <div className="flex items-center gap-2">
              <label className="text-gray-300 text-sm whitespace-nowrap">Precio (€):</label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="flex-1 bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sand-400"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setView("main")} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Atrás</button>
              <button onClick={handleReserve} disabled={loading} className="flex-1 bg-amber-700 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? "..." : "Reservar"}
              </button>
            </div>
          </div>
        )}

        {/* ── RESERVADA ── */}
        {status === "reserved" && view === "main" && (
          <div className="space-y-3">
            <div className="bg-ocean-900 rounded-xl p-3 text-sm">
              <p className="text-gray-400">Cliente</p>
              <p className="text-white font-medium">{rental?.client_name || "—"}</p>
              <p className="text-gray-400 mt-2">Precio acordado</p>
              <p className="text-white font-medium">{rental?.price?.toFixed(2)} €</p>
            </div>
            <button onClick={handleCheckin} disabled={loading} className="w-full bg-ocean-600 hover:bg-ocean-500 text-white font-bold py-3 rounded-xl">
              ✅ Confirmar llegada (Check-in)
            </button>
            <button onClick={handleFree} disabled={loading} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl text-sm">
              🗑️ Cancelar reserva
            </button>
          </div>
        )}

        {/* ── OCUPADA ── */}
        {status === "occupied" && view === "main" && (
          <div className="space-y-3">
            {/* Info cliente */}
            <div className="bg-ocean-900 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente</span>
                <span className="text-white font-medium">{rental?.client_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Alquiler</span>
                <span className="text-white">{rental?.price?.toFixed(2)} €</span>
              </div>
              {rental?.refund_amount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Reembolso</span>
                  <span>-{rental.refund_amount.toFixed(2)} €</span>
                </div>
              )}
              {consumptionsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Consumiciones</span>
                  <span className="text-white">{consumptionsTotal.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between border-t border-ocean-700 pt-1.5 font-bold">
                <span className="text-gray-300">Total</span>
                <span className="text-sand-400">
                  {((rental?.price || 0) - (rental?.refund_amount || 0) + consumptionsTotal).toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Consumiciones lista */}
            {rental?.consumptions?.length > 0 && (
              <div className="bg-ocean-900 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2 font-medium">CONSUMICIONES</p>
                {rental.consumptions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-300">{c.name} x{c.qty}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">{(c.price * c.qty).toFixed(2)} €</span>
                      <button onClick={() => removeConsumption(c.id)} className="text-red-400 text-lg leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones */}
            <button onClick={() => setView("consumptions")} className="w-full bg-sand-500 hover:bg-sand-400 text-ocean-900 font-bold py-3 rounded-xl">
              🍺 Añadir consumición
            </button>
            <button onClick={() => setView("refund")} className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-xl font-medium">
              💸 Reembolso parcial
            </button>
            <button onClick={handleFree} disabled={loading} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl text-sm">
              🚪 Liberar tumbona
            </button>
          </div>
        )}

        {/* ── CONSUMICIONES ── */}
        {view === "consumptions" && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">Añadir consumición</h3>
            {products.length === 0 && (
              <p className="text-gray-400 text-sm">No hay productos configurados. Ve a Ajustes → Carta.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addConsumption(p)}
                  disabled={loading}
                  className="bg-ocean-900 border border-ocean-700 rounded-xl p-3 text-left hover:border-sand-400 transition-colors"
                >
                  <div className="font-medium text-white text-sm">{p.name}</div>
                  <div className="text-sand-400 text-sm">{p.price.toFixed(2)} €</div>
                </button>
              ))}
            </div>
            <button onClick={() => setView("main")} className="w-full bg-gray-700 text-white py-2.5 rounded-xl mt-2">
              Cancelar
            </button>
          </div>
        )}

        {/* ── REEMBOLSO ── */}
        {view === "refund" && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">💸 Reembolso parcial</h3>
            <p className="text-gray-400 text-sm">Precio pagado: {rental?.price?.toFixed(2)} €</p>
            <div className="flex items-center gap-2">
              <label className="text-gray-300 text-sm whitespace-nowrap">Importe a devolver (€):</label>
              <input
                type="number"
                step="0.50"
                min="0"
                max={rental?.price}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sand-400"
              />
            </div>
            <input
              placeholder="Motivo (opcional)"
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              className="w-full bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-sand-400"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setView("main")} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Atrás</button>
              <button onClick={handleRefund} disabled={loading || !refundAmount} className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? "..." : "Aplicar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
