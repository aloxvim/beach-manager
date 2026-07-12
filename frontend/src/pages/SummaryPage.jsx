import { useState, useEffect } from "react";
import { api } from "../api";
import BottomNav from "../components/BottomNav";

const STATUS_LABEL = {
  reserved: "Reservado", pending: "Pendiente", paid: "Pagado",
  paid_table: "Pagado en mesa", guest: "Invitado",
};

export default function SummaryPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.getSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const blob = await api.getPdf(today);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `resumen-${today}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Error: " + e.message); }
    finally { setExporting(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pb-20">
      <div className="text-ocean-600 animate-pulse">Cargando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ocean-900 pb-24">
      <div className="bg-ocean-800 px-4 py-3 sticky top-0 z-10 shadow-lg">
        <h1 className="font-bold text-white text-lg">📊 Resumen del día</h1>
        <p className="text-ocean-600 text-xs">{today}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Comandas" value={summary?.totalOrders ?? 0} color="text-white" />
          <StatCard label="Total ingresos" value={(summary?.totalIncome ?? 0).toFixed(2)} unit="€" color="text-sand-400" />
          <StatCard label="Tumbonas (neto)" value={(summary?.netBeds ?? 0).toFixed(2)} unit="€" color="text-green-400" />
          <StatCard label="Consumiciones" value={(summary?.totalItems ?? 0).toFixed(2)} unit="€" color="text-amber-400" />
        </div>

        {summary?.guestCount > 0 && (
          <div className="bg-purple-900/30 border border-purple-800 rounded-xl p-3 flex justify-between">
            <span className="text-purple-300 text-sm">Invitados (sin cargo)</span>
            <span className="text-purple-400 font-bold">{summary.guestCount}</span>
          </div>
        )}
        {summary?.totalRefunds > 0 && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 flex justify-between">
            <span className="text-red-300 text-sm">Reembolsos</span>
            <span className="text-red-400 font-bold">-{summary.totalRefunds.toFixed(2)} €</span>
          </div>
        )}

        {summary?.orders?.length > 0 ? (
          <div>
            <h2 className="text-xs text-gray-400 font-medium mb-2">DETALLE</h2>
            <div className="space-y-2">
              {summary.orders.map((o) => {
                const itemsTotal = (o.items || []).reduce((s, i) => s + i.price * i.qty, 0);
                const bedsTotal = o.status === "guest" ? 0 :
                  (o.standard_beds * o.standard_price) + (o.balinese_beds > 0 ? (o.balinese_price || 0) : 0);
                const net = bedsTotal - (o.refund_amount || 0) + itemsTotal;
                return (
                  <div key={o.id} className="bg-ocean-800 rounded-xl p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-white">Sombrilla {o.umbrella_num}</span>
                        {o.client_name && <span className="text-gray-400 ml-2">· {o.client_name}</span>}
                        <span className="text-xs text-gray-500 ml-2">[{STATUS_LABEL[o.status] || o.status}]</span>
                      </div>
                      {o.status !== "guest" && <span className="text-sand-400 font-bold">{net.toFixed(2)} €</span>}
                    </div>
                    <div className="text-gray-500 text-xs mt-1 space-y-0.5">
                      {o.standard_beds > 0 && <div>{o.standard_beds} tumbona{o.standard_beds > 1 ? "s" : ""} × {o.standard_price.toFixed(2)} €</div>}
                      {o.balinese_beds > 0 && <div>{o.balinese_beds} balinesa{o.balinese_beds > 1 ? "s" : ""}: {(o.balinese_price || 0).toFixed(2)} €</div>}
                      {itemsTotal > 0 && <div>Consumiciones: {itemsTotal.toFixed(2)} €</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🏖️</div>
            <p>Sin comandas registradas hoy</p>
          </div>
        )}

        <button onClick={handleExportPdf} disabled={exporting || !summary?.totalOrders}
          className="w-full bg-sand-400 hover:bg-sand-300 disabled:opacity-40 text-ocean-900 font-bold py-3.5 rounded-xl">
          {exporting ? "Generando PDF..." : "📄 Exportar PDF"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="bg-ocean-800 rounded-xl p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}{unit && <span className="text-lg ml-0.5">{unit}</span>}</div>
      <div className="text-gray-400 text-xs mt-0.5">{label}</div>
    </div>
  );
}