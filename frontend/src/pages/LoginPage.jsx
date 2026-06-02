import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Contraseña incorrecta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏖️</div>
          <h1 className="text-2xl font-bold text-white">Beach Manager</h1>
          <p className="text-ocean-600 text-sm mt-1">Gestión de tumbonas</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-ocean-800 rounded-2xl p-6 shadow-xl">
          <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            className="w-full bg-ocean-900 border border-ocean-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sand-400 transition-colors"
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-4 bg-sand-400 hover:bg-sand-300 disabled:opacity-40 text-ocean-900 font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
