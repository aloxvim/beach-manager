import { useState, useEffect } from "react";
import { api } from "../api";
import BottomNav from "../components/BottomNav";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getHistory().then(setHistory).finally(() => setLoading(false));
  }, []);

  async function loadDay(date) {
    setSelected(date);
    setSummary(null);
    const s = await api.getSummary(date);
    setSummary(s);
  }

  async function handleExportPdf(date) {
    setExporting(true);
    try {
      const blob = await api.getPdf(date);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Error: " + e.message); }
    finally { setExporting(false); }
  }

  return (
    <div className="min-h-screen bg-ocean-900 pb-24">
      <div className="bg-ocean-800 px-4 py-3 sticky top-0 z-10 shadow-lg">
        <h1 className="font-bold text-white text-lg">📅 Historial</h1>
        <p className="text-ocean-600 text-xs">Últimos 60 días con actividad</p>
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-ocean-600 animate-pulse text-center py-8">Cargando...</p>}
        {!loading && history.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-2">📭</div>
            <p>Sin historial todavía</p>
          </div>
        )}

        <div className="space-y-2">
          {history.map((day) => (
            <div key={day.date}>
              <button
                onClick={() => loadDay(day.date)}
                className={`w-full text-left rounded-xl p-4 transition-colors ${
                  selected === day.date ? "bg-ocean-700 border border-ocean-500" : "bg-ocean-800 hover:bg-ocean-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white">{day.date}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{day.rentals} tumbona{day.rentals !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="text-sand-400 font-bold text-lg">
                    {(day.net_rentals || 0).toFixed(2)} €
                  </div>
                </div>
              </button>

              {/* Expanded day summary */}
              {selected === day.date && (
                <div className="bg-ocean-900 border border-ocean-700 rounded-xl mt-1 p-4 space-y-3">
                  {!summary && <p className="text-ocean-600 animate-pulse text-sm">Cargando detalle...</p>}
                  {summary && (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-ocean-800 rounded-lg p-2.5">
                          <div className="text-green-400 font-bold">{summary.netRentals.toFixed(2)} €</div>
                          <div className="text-gray-400 text-xs">Alquiler neto</div>
                        </div>
                        <div className="bg-ocean-800 rounded-lg p-2.5">
                          <div className="text-amber-400 font-bold">{summary.totalConsumptions.toFixed(2)} €</div>
                          <div className="text-gray-400 text-xs">Consumiciones</div>
                        </div>
                      </div>
                      {summary.totalRefunds > 0 && (
                        <div className="text-red-400 text-xs">Reembolsos: -{summary.totalRefunds.toFixed(2)} €</div>
                      )}
                      <div className="flex justify-between items-center border-t border-ocean-700 pt-2">
                        <span className="font-bold text-white">TOTAL: {summary.totalIncome.toFixed(2)} €</span>
                        <button
                          onClick={() => handleExportPdf(day.date)}
                          disabled={exporting}
                          className="bg-sand-400 hover:bg-sand-300 text-ocean-900 font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-40"
                        >
                          {exporting ? "..." : "📄 PDF"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
