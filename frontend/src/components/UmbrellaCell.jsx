export default function UmbrellaCell({ umbrella, rental, onClick }) {
  const status = rental?.status || "free";

  const colorMap = {
    free:     "bg-gray-700 border-gray-600 text-gray-400",
    reserved: "bg-amber-800 border-amber-600 text-amber-200",
    occupied: "bg-ocean-700 border-ocean-500 text-white",
  };

  const iconMap = {
    free:     "🛏️",
    reserved: "📋",
    occupied: "👤",
  };

  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center text-base transition-all active:scale-95 ${colorMap[status]}`}
      title={rental?.client_name || umbrella.id}
    >
      {iconMap[status]}
    </button>
  );
}
