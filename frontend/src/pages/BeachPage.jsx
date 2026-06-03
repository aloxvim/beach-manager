import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import UmbrellaCell from "../components/UmbrellaCell";
import UmbrellaModal from "../components/UmbrellaModal";
import BottomNav from "../components/BottomNav";

const ROWS = 2;
const UMBRELLAS_PER_ROW = 15;

function buildUmbrellaId(row, col, side) {
  return `R${row}-U${col}-${side}`;
}

function buildExtraId(row, col, n) {
  return `R${row}-U${col}-X${n}`;
}

function generateBaseUmbrellas() {
  const umbrellas = [];
  for (let row = 1; row <= ROWS; row++) {
    for (let col = 1; col <= UMBRELLAS_PER_ROW; col++) {
      umbrellas.push({ id: buildUmbrellaId(row, col, "L"), row, col, side: "L", isExtra: false });
      umbrellas.push({ id: buildUmbrellaId(row, col, "R"), row, col, side: "R", isExtra: false });
    }
  }
  return umbrellas;
}

// Parse umbrella_id to get row and col, works for base and extra
function parseUmbrellaId(id) {
  const m = id.match(/^R(\d+)-U(\d+)-/);
  return m ? { row: parseInt(m[1]), col: parseInt(m[2]) } : null;
}

export default function BeachPage() {
  const [rentals, setRentals] = useState({});
  const [selectedUmbrella, setSelectedUmbrella] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ daily_price: "5" });
  const [products, setProducts] = useState([]);
  // extras: { "R1-U3": [{id, ...}, ...] }
  const [extras, setExtras] = useState({});

  const baseUmbrellas = generateBaseUmbrellas();
  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    try {
      const [rentalsData, settingsData, productsData] = await Promise.all([
        api.getRentals(),
        api.getSettings(),
        api.getProducts(),
      ]);
      const rentalsMap = {};
      const extrasMap = {};

      rentalsData.forEach((r) => {
        // 'done' = turno cerrado con ingresos; visualmente libre para nuevo cliente
        if (r.status !== "done") {
          rentalsMap[r.umbrella_id] = r;
        }
        // Detect extras: IDs with -X suffix
        if (r.umbrella_id.includes("-X")) {
          const parsed = parseUmbrellaId(r.umbrella_id);
          if (parsed) {
            const key = `R${parsed.row}-U${parsed.col}`;
            if (!extrasMap[key]) extrasMap[key] = [];
            if (!extrasMap[key].find((e) => e.id === r.umbrella_id)) {
              extrasMap[key].push({
                id: r.umbrella_id,
                row: parsed.row,
                col: parsed.col,
                isExtra: true,
              });
            }
          }
        }
      });

      setRentals(rentalsMap);
      setSettings(settingsData);
      setProducts(productsData);
      setExtras(extrasMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleModalClose(updated) {
    if (updated) loadData();
    setSelectedUmbrella(null);
  }

  function addExtra(row, col) {
    const key = `R${row}-U${col}`;
    const current = extras[key] || [];
    const n = current.length + 1;
    const newId = buildExtraId(row, col, n);
    const newUmbrella = { id: newId, row, col, isExtra: true };
    setExtras((prev) => ({ ...prev, [key]: [...current, newUmbrella] }));
    // Open it immediately so the worker can assign it right away
    setSelectedUmbrella(newUmbrella);
  }

  function removeExtra(umbrellaId) {
    const parsed = parseUmbrellaId(umbrellaId);
    if (!parsed) return;
    const key = `R${parsed.row}-U${parsed.col}`;
    setExtras((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((e) => e.id !== umbrellaId),
    }));
  }

  const row1 = baseUmbrellas.filter((u) => u.row === 1);
  const row2 = baseUmbrellas.filter((u) => u.row === 2);

  const occupied = Object.values(rentals).filter((r) => r.status === "occupied").length;
  const reserved = Object.values(rentals).filter((r) => r.status === "reserved").length;
  const totalBase = baseUmbrellas.length;
  const totalExtras = Object.values(extras).reduce((s, arr) => s + arr.length, 0);
  const free = totalBase + totalExtras - occupied - reserved;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ocean-600 text-lg animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ocean-900 pb-20">
      {/* Header */}
      <div className="bg-ocean-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div>
          <h1 className="font-bold text-white text-lg">🏖️ Beach Manager</h1>
          <p className="text-ocean-600 text-xs">{today}</p>
        </div>
        <div className="flex gap-3 text-xs text-center">
          <div><div className="font-bold text-green-400">{free}</div><div className="text-gray-400">Libres</div></div>
          <div><div className="font-bold text-amber-400">{reserved}</div><div className="text-gray-400">Reserv.</div></div>
          <div><div className="font-bold text-ocean-400">{occupied}</div><div className="text-gray-400">Ocupadas</div></div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600 inline-block" />Libre</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-700 inline-block" />Reservada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-ocean-700 inline-block" />Ocupada</span>
      </div>

      {/* Beach grid */}
      <div className="px-2 space-y-6 mt-2">
        {[row1, row2].map((rowUmbrellas, rowIdx) => (
          <div key={rowIdx}>
            <div className="text-xs text-gray-500 px-2 mb-2 font-medium">FILA {rowIdx + 1}</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {Array.from({ length: UMBRELLAS_PER_ROW }, (_, i) => {
                const col = i + 1;
                const row = rowIdx + 1;
                const left = rowUmbrellas.find((u) => u.col === col && u.side === "L");
                const right = rowUmbrellas.find((u) => u.col === col && u.side === "R");
                const key = `R${row}-U${col}`;
                const extraList = extras[key] || [];

                return (
                  <div key={col} className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-600 mb-0.5">{col}</span>
                    <div className="flex items-center gap-0.5">
                      <UmbrellaCell umbrella={left} rental={rentals[left.id]} onClick={() => setSelectedUmbrella(left)} />
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base">☂️</span>
                        {/* Extra tumbonas bajo la sombrilla */}
                        {extraList.map((ex) => (
                          <UmbrellaCell
                            key={ex.id}
                            umbrella={ex}
                            rental={rentals[ex.id]}
                            onClick={() => setSelectedUmbrella(ex)}
                          />
                        ))}
                        {/* Botón añadir extra */}
                        <button
                          onClick={() => addExtra(row, col)}
                          className="w-5 h-5 rounded-full bg-gray-700 hover:bg-sand-500 text-gray-400 hover:text-ocean-900 text-xs font-bold flex items-center justify-center transition-colors"
                          title="Añadir tumbona extra"
                        >+</button>
                      </div>
                      <UmbrellaCell umbrella={right} rental={rentals[right.id]} onClick={() => setSelectedUmbrella(right)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedUmbrella && (
        <UmbrellaModal
          umbrella={selectedUmbrella}
          rental={rentals[selectedUmbrella.id]}
          settings={settings}
          products={products}
          onClose={(updated, freed) => {
            // If the extra was freed with no rental record, remove from UI
            if (selectedUmbrella.isExtra && freed) removeExtra(selectedUmbrella.id);
            handleModalClose(updated);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
