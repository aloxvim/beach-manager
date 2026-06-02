import { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";

export default function SettingsPage() {
  const { logout } = useAuth();
  const [settings, setSettings] = useState({ daily_price: "5", beach_name: "Playa" });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    Promise.all([api.getSettings(), api.getAllProducts()])
      .then(([s, p]) => { setSettings(s); setProducts(p); })
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key, value) {
    await api.updateSetting(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addProduct() {
    if (!newName || !newPrice) return;
    const p = await api.createProduct({ name: newName, price: parseFloat(newPrice) });
    setProducts((prev) => [...prev, p]);
    setNewName(""); setNewPrice("");
  }

  async function toggleProduct(p) {
    const updated = await api.updateProduct(p.id, { active: p.active ? 0 : 1 });
    setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function deleteProduct(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    await api.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pb-20">
      <div className="text-ocean-600 animate-pulse">Cargando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ocean-900 pb-24">
      <div className="bg-ocean-800 px-4 py-3 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="font-bold text-white text-lg">⚙️ Ajustes</h1>
          {saved && <p className="text-green-400 text-xs">Guardado ✓</p>}
        </div>
        <button onClick={logout} className="text-gray-400 text-sm hover:text-white">Cerrar sesión</button>
      </div>

      <div className="px-4 pt-4 space-y-6">

        {/* General */}
        <section>
          <h2 className="text-xs font-medium text-gray-400 mb-2">GENERAL</h2>
          <div className="bg-ocean-800 rounded-xl divide-y divide-ocean-700">
            <SettingRow label="Nombre de la playa">
              <input
                value={settings.beach_name || ""}
                onChange={(e) => setSettings((s) => ({ ...s, beach_name: e.target.value }))}
                onBlur={(e) => saveSetting("beach_name", e.target.value)}
                className="bg-transparent text-right text-white focus:outline-none w-40 text-sm"
              />
            </SettingRow>
            <SettingRow label="Precio diario (€)">
              <input
                type="number"
                step="0.50"
                min="0"
                value={settings.daily_price || "5"}
                onChange={(e) => setSettings((s) => ({ ...s, daily_price: e.target.value }))}
                onBlur={(e) => saveSetting("daily_price", e.target.value)}
                className="bg-transparent text-right text-white focus:outline-none w-20 text-sm"
              />
            </SettingRow>
          </div>
          <p className="text-gray-500 text-xs mt-1.5 px-1">
            El precio diario es el valor por defecto al ocupar una tumbona. Siempre se puede modificar caso a caso.
          </p>
        </section>

        {/* Carta / productos */}
        <section>
          <h2 className="text-xs font-medium text-gray-400 mb-2">CARTA DE CONSUMICIONES</h2>
          <div className="bg-ocean-800 rounded-xl overflow-hidden">
            {products.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Sin productos todavía</p>
            )}
            {products.map((p) => (
              <div key={p.id} className={`flex items-center justify-between px-4 py-3 border-b border-ocean-700 last:border-0 ${!p.active ? "opacity-50" : ""}`}>
                <div>
                  <span className="text-white text-sm font-medium">{p.name}</span>
                  <span className="text-gray-400 text-sm ml-2">{p.price.toFixed(2)} €</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleProduct(p)}
                    className={`text-xs px-2 py-1 rounded-lg ${p.active ? "bg-ocean-700 text-ocean-200" : "bg-gray-700 text-gray-400"}`}
                  >
                    {p.active ? "Activo" : "Inactivo"}
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 text-lg leading-none px-1">×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Añadir producto */}
          <div className="bg-ocean-800 rounded-xl mt-2 p-3 flex gap-2">
            <input
              placeholder="Nombre"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-sand-400"
            />
            <input
              type="number"
              placeholder="€"
              step="0.50"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-20 bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-sand-400"
            />
            <button
              onClick={addProduct}
              disabled={!newName || !newPrice}
              className="bg-sand-400 hover:bg-sand-300 text-ocean-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
            >
              +
            </button>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-gray-300 text-sm">{label}</span>
      {children}
    </div>
  );
}
