import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import UmbrellaCell from "../components/UmbrellaCell";
import UmbrellaModal from "../components/UmbrellaModal";
import BottomNav from "../components/BottomNav";

const ROWS = 2;
const UMBRELLAS_PER_ROW = 15;

function buildUmbrellaId(row, col, side) {
  // R1-U3-L = Fila 1, Sombrilla 3, tumbona Izquierda
  return `R${row}-U${col}-${side}`;
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

export default function BeachPage() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState({});
  const [selectedUmbrella, setSelectedUmbrella] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ daily_price: "5" });
  const [products, setProducts] = useState([]);

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
      rentalsData.forEach((r) => { rentalsMap[r.umbrella_id] = r; });
      setRentals(rentalsMap);
      setSettings(settingsData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleUmbrellaClick(umbrella) {
    setSelectedUmbrella(umbrella);
  }

  function handleModalClose(updated) {
    if (updated) loadData();
    setSelectedUmbrella(null);
  }

  // Group by row for rendering
  const row1 = baseUmbrellas.filter((u) => u.row === 1);
  const row2 = baseUmbrellas.filter((u) => u.row === 2);

  // Count stats
  const occupied = Object.values(rentals).filter((r) => r.status === "occupied").length;
  const reserved = Object.values(rentals).filter((r) => r.status === "reserved").length;
  const free = baseUmbrellas.length - occupied - reserved;

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
          <div>
            <div className="font-bold text-green-400">{free}</div>
            <div className="text-gray-400">Libres</div>
          </div>
          <div>
            <div className="font-bold text-amber-400">{reserved}</div>
            <div className="text-gray-400">Reserv.</div>
          </div>
          <div>
            <div className="font-bold text-ocean-400">{occupied}</div>
            <div className="text-gray-400">Ocupadas</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600 inline-block"/>Libre</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-700 inline-block"/>Reservada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-ocean-700 inline-block"/>Ocupada</span>
      </div>

      {/* Beach grid */}
      <div className="px-2 space-y-6 mt-2">
        {[row1, row2].map((rowUmbrellas, rowIdx) => (
          <div key={rowIdx}>
            <div className="text-xs text-gray-500 px-2 mb-2 font-medium">FILA {rowIdx + 1}</div>
            {/* Pairs: each pair = left tumbona + umbrella icon + right tumbona */}
            <div className="flex flex-wrap gap-1 justify-center">
              {Array.from({ length: UMBRELLAS_PER_ROW }, (_, i) => {
                const col = i + 1;
                const left  = rowUmbrellas.find((u) => u.col === col && u.side === "L");
                const right = rowUmbrellas.find((u) => u.col === col && u.side === "R");
                return (
                  <div key={col} className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-600 mb-0.5">{col}</span>
                    <div className="flex items-center gap-0.5">
                      <UmbrellaCell
                        umbrella={left}
                        rental={rentals[left.id]}
                        onClick={() => handleUmbrellaClick(left)}
                      />
                      <span className="text-base">☂️</span>
                      <UmbrellaCell
                        umbrella={right}
                        rental={rentals[right.id]}
                        onClick={() => handleUmbrellaClick(right)}
                      />
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
          onClose={handleModalClose}
        />
      )}

      <BottomNav />
    </div>
  );
}
