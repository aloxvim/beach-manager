import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import OrderModal from "../components/OrderModal";
import BottomNav from "../components/BottomNav";

const NORMAL_MIN = 500;
const NORMAL_MAX = 530;
const BALINESE_MIN = 531;
const BALINESE_MAX = 539;

function isBalinese(num) { return num >= BALINESE_MIN; }

function allUmbrellas() {
  const list = [];
  for (let i = NORMAL_MIN; i <= BALINESE_MAX; i++) list.push(i);
  return list;
}

const STATUS_COLOR = {
  reserved: "bg-amber-800 border-amber-600",
  pending: "bg-red-900 border-red-700",
  paid: "bg-ocean-700 border-ocean-500",
  paid_table: "bg-green-900 border-green-700",
  guest: "bg-purple-900 border-purple-700",
};

const STATUS_LABEL = {
  reserved: "Reservado", pending: "Pendiente", paid: "Pagado",
  paid_table: "Pagado en mesa", guest: "Invitado",
};

export default function BeachPage() {
  const [orders, setOrders] = useState({});   // umbrella_num → [order, ...]
  const [selected, setSelected] = useState(null); // { num, order | null }
  const [multiSelect, setMultiSelect] = useState(null); // num con varias comandas
  const [settings, setSettings] = useState({ standard_price: "6" });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    const [ordersData, settingsData, productsData] = await Promise.all([
      api.getOrders(), api.getSettings(), api.getProducts(),
    ]);
    // Group active (non-closed) orders by umbrella
    const map = {};
    ordersData.forEach((o) => {
      if (o.closed) return;
      if (!map[o.umbrella_num]) map[o.umbrella_num] = [];
      map[o.umbrella_num].push(o);
    });
    setOrders(map);
    setSettings(settingsData);
    setProducts(productsData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleClick(num) {
    const active = orders[num] || [];
    if (active.length === 0) {
      setSelected({ num, order: null });
    } else {
      setMultiSelect(num);
    }
  }

  function handleModalClose(changed) {
    if (changed) loadData();
    setSelected(null);
  }

  const umbrellas = allUmbrellas();
  const normalList = umbrellas.filter((n) => !isBalinese(n));
  const balineseList = umbrellas.filter((n) => isBalinese(n));

  // Stats
  const activeOrders = Object.values(orders).flat();
  const occupied = activeOrders.length;
  const pending = activeOrders.filter((o) => o.status === "pending").length;
  const paid = activeOrders.filter((o) => o.status === "paid" || o.status === "paid_table").length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-ocean-600 animate-pulse text-lg">Cargando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ocean-900 pb-20">
      {/* Header */}
      <div className="bg-ocean-800 px-4 py-3 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="font-bold text-white text-lg">🏖️ Beach Manager</h1>
          <p className="text-ocean-600 text-xs">{today}</p>
        </div>
        <div className="flex gap-3 text-xs text-center">
          <div><div className="font-bold text-white">{occupied}</div><div className="text-gray-400">Activas</div></div>
          <div><div className="font-bold text-red-400">{pending}</div><div className="text-gray-400">Pend.</div></div>
          <div><div className="font-bold text-ocean-400">{paid}</div><div className="text-gray-400">Pagadas</div></div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2 text-xs">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded border ${STATUS_COLOR[k]}`} />
            {v}
          </span>
        ))}
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border bg-gray-700 border-gray-600" />Libre</span>
      </div>

      <div className="px-3 space-y-5 mt-1">
        {/* Sombrillas normales */}
        <section>
          <div className="text-xs text-gray-500 mb-2 font-medium px-1">☂️ SOMBRILLAS (500–530)</div>
          <div className="flex flex-wrap gap-2">
            {normalList.map((num) => (
              <UmbrellaButton key={num} num={num} orders={orders[num] || []} onClick={() => handleClick(num)} />
            ))}
          </div>
        </section>

        {/* Balinesas */}
        <section>
          <div className="text-xs text-gray-500 mb-2 font-medium px-1">🛏️ BALINESAS (531–539)</div>
          <div className="flex flex-wrap gap-2">
            {balineseList.map((num) => (
              <UmbrellaButton key={num} num={num} orders={orders[num] || []} onClick={() => handleClick(num)} balinese />
            ))}
          </div>
        </section>
      </div>

      {multiSelect !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
          onClick={() => setMultiSelect(null)}>
          <div className="bg-ocean-800 w-full max-w-lg rounded-t-2xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-white text-lg">☂️ Sombrilla {multiSelect}</h2>
              <button onClick={() => setMultiSelect(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2">
              {(orders[multiSelect] || []).map((o, i) => (
                <button key={o.id} onClick={() => { setMultiSelect(null); setSelected({ num: multiSelect, order: o }); }}
                  className="w-full bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-3 text-left hover:border-sand-400 transition-colors">
                  <span className="text-white font-medium">Comanda {i + 1}</span>
                  {o.client_name && <span className="text-gray-400 ml-2">· {o.client_name}</span>}
                  <span className="text-xs text-gray-500 ml-2">
                    · {(o.standard_beds || 0) + (o.balinese_beds || 0)} tumbonas
                  </span>
                </button>
              ))}
              <button onClick={() => { setMultiSelect(null); setSelected({ num: multiSelect, order: null }); }}
                className="w-full bg-sand-500 hover:bg-sand-400 text-ocean-900 font-bold py-3 rounded-xl mt-1">
                + Nueva comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <OrderModal
          num={selected.num}
          order={selected.order}
          settings={settings}
          products={products}
          onClose={handleModalClose}
        />
      )}

      <BottomNav />
    </div>
  );
}

function UmbrellaButton({ num, orders, onClick, balinese }) {
  const active = orders.filter((o) => !o.closed);
  const last = active.length > 0 ? active[active.length - 1] : null;
  const status = last?.status || null;
  const colorClass = status ? STATUS_COLOR[status] : "bg-gray-800 border-gray-700";
  const icon = balinese ? "🛏️" : "☂️";

  const shortName = active
    .filter((o) => o.client_name)
    .map((o) => o.client_name.trim().split(" ")[0].slice(0, 12))
    .join(" / ") || null;

  const totalBeds = (parseInt(last?.standard_beds) || 0) + (parseInt(last?.balinese_beds) || 0);

  return (
    <button
      onClick={onClick}
      className={`relative border rounded-xl px-2 py-2 text-center min-w-[52px] transition-all active:scale-95 ${colorClass}`}
    >
      <div className="text-lg leading-none">{icon}</div>
      <div className="text-white text-xs font-bold mt-0.5">{num}</div>
      {totalBeds > 0 && (
        <div className="text-white text-[10px]">{totalBeds} 🛏️</div>
      )}
      {shortName && (
        <div className="text-[10px] text-white/80 leading-tight mt-0.5 max-w-[52px] truncate">
          {shortName}
        </div>
      )}
      {active.length > 1 && (
        <span className="absolute -top-1 -right-1 bg-sand-400 text-ocean-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {active.length}
        </span>
      )}
    </button>
  );
}