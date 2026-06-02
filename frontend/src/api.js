const BASE = "/api";

function getToken() {
  return localStorage.getItem("bm_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("bm_token");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error || "Error en la petición");
  }

  if (res.headers.get("content-type")?.includes("application/pdf")) {
    return res.blob();
  }
  return res.json();
}

export const api = {
  login: (password) => request("/auth/login", { method: "POST", body: { password } }),

  getSettings: () => request("/settings"),
  updateSetting: (key, value) => request(`/settings/${key}`, { method: "PUT", body: { value } }),

  getProducts: () => request("/products"),
  getAllProducts: () => request("/products/all"),
  createProduct: (data) => request("/products", { method: "POST", body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  getRentals: (date) => request(`/rentals${date ? `?date=${date}` : ""}`),
  createRental: (data) => request("/rentals", { method: "POST", body: data }),
  updateRental: (id, data) => request(`/rentals/${id}`, { method: "PATCH", body: data }),
  reserveUmbrella: (id, data) => request(`/rentals/${id}/reserve`, { method: "POST", body: data }),
  checkinRental: (id) => request(`/rentals/${id}/checkin`, { method: "POST" }),
  addConsumption: (id, data) => request(`/rentals/${id}/consumptions`, { method: "POST", body: data }),
  deleteConsumption: (rentalId, cid) => request(`/rentals/${rentalId}/consumptions/${cid}`, { method: "DELETE" }),

  getSummary: (date) => request(`/rentals/summary${date ? `?date=${date}` : ""}`),
  getHistory: () => request("/rentals/history"),

  getPdf: (date) => request(`/pdf/summary/${date}`, { headers: { Accept: "application/pdf" } }),
};
