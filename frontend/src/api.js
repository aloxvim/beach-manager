const BASE = "/api";

function getToken() { return localStorage.getItem("bm_token"); }

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
  if (res.headers.get("content-type")?.includes("application/pdf")) return res.blob();
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

  getOrders: (date) => request(`/orders${date ? `?date=${date}` : ""}`),
  createOrder: (data) => request("/orders", { method: "POST", body: data }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: "PATCH", body: data }),
  closeOrder: (id) => request(`/orders/${id}/close`, { method: "POST" }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: "DELETE" }),
  addItem: (id, data) => request(`/orders/${id}/items`, { method: "POST", body: data }),
  deleteItem: (orderId, iid) => request(`/orders/${orderId}/items/${iid}`, { method: "DELETE" }),

  getSummary: (date) => request(`/orders/summary${date ? `?date=${date}` : ""}`),
  getHistory: () => request("/orders/history"),
  getPdf: (date) => request(`/pdf/summary/${date}`, { headers: { Accept: "application/pdf" } }),
};