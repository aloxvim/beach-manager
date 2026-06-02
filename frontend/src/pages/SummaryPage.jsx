import { useState, useEffect } from "react";
import { api } from "../api";
import BottomNav from "../components/BottomNav";

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
      a.href = url;
      a.download = `resumen-${today}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error generando PDF: " + e.message);
    } finally {
      setExporting(false);
    }
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
        {/* Totales */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tumbonas alquiladas" value={summary?.totalRentals ?? 0} unit="" color="text-ocean-400" />
          <StatCard label="Total ingresos" value={(summary?.totalIncome ?? 0).toFixed(2)} unit="€" color="text-sand-400" />
          <StatCard label="Alquiler neto" value={(summary?.netRentals ?? 0).toFixed(2)} unit="€" color="text-green-400" />
          <StatCard label="Consumiciones" value={(summary?.totalConsumptions ?? 0).toFixed(2)} unit="€" color="text-amber-400" />
        </div>

        {/* Reembolsos si hay */}
        {summary?.totalRefunds > 0 && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 flex justify-between items-center">
            <span className="text-red-300 text-sm">Reembolsos aplicados</span>
            <span className="text-red-400 font-bold">-{summary.totalRefunds.toFixed(2)} €</span>
          </div>
        )}

        {/* Detalle por tumbona */}
        {summary?.rentals?.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-2">DETALLE POR TUMBONA</h2>
            <div className="space-y-2">
              {summary.rentals.map((r) => {
                const consTotal = (r.consumptions || []).reduce((s, c) => s + c.price * c.qty, 0);
                const net = r.price - (r.refund_amount || 0) + consTotal;
                return (
                  <div key={r.id} className="bg-ocean-800 rounded-xl p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-medium text-white">{r.umbrella_id}</span>
                        {r.client_name && <span className="text-gray-400 ml-2">· {r.client_name}</span>}
                      </div>
                      <span className="text-sand-400 font-bold">{net.toFixed(2)} €</span>
                    </div>
                    <div className="text-gray-500 text-xs space-y-0.5">
                      <div>Alquiler: {r.price.toFixed(2)} €{r.refund_amount > 0 ? ` (reembolso: -${r.refund_amount.toFixed(2)} €)` : ""}</div>
                      {consTotal > 0 && <div>Consumiciones: {consTotal.toFixed(2)} €</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🏖️</div>
            <p>No hay alquileres registrados hoy</p>
          </div>
        )}

        {/* Export PDF */}
        <button
          onClick={handleExportPdf}
          disabled={exporting || !summary?.totalRentals}
          className="w-full bg-sand-400 hover:bg-sand-300 disabled:opacity-40 text-ocean-900 font-bold py-3.5 rounded-xl mt-2"
        >
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
