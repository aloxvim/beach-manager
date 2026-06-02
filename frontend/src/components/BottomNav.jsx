import { NavLink } from "react-router-dom";

const links = [
  { to: "/",        icon: "🏖️", label: "Playa" },
  { to: "/summary", icon: "📊", label: "Resumen" },
  { to: "/history", icon: "📅", label: "Historial" },
  { to: "/settings",icon: "⚙️", label: "Ajustes" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-ocean-800 border-t border-ocean-700 flex z-20 safe-area-pb">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
              isActive ? "text-sand-400" : "text-gray-500 hover:text-gray-300"
            }`
          }
        >
          <span className="text-xl mb-0.5">{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
