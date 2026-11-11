// Thin fetch wrapper around the backend API.
// Base URL comes from VITE_API_URL (see .env.example), e.g. http://localhost:5000/api

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const TOKEN_KEY = "ac_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  }
};

// Called when the API says the session is no longer valid (set by AuthContext)
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Drops undefined / empty values so they are not sent as query params
const buildQuery = (params) => {
  if (!params) return "";
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
};

async function request(method, path, { body, params, raw = false } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}${buildQuery(params)}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and that the API is running.");
  }

  if (raw && res.ok) return res;

  let data = null;
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) data = await res.json().catch(() => null);

  if (!res.ok) {
    // A 401 on a logged-in request means the token is expired/revoked
    if (res.status === 401 && token) onUnauthorized(data?.message);
    throw new ApiError(res.status, data?.message || `Request failed (${res.status})`, data?.details);
  }
  return data;
}

export const http = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body) => request("POST", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  del: (path) => request("DELETE", path),
  upload: (path, formData) => request("POST", path, { body: formData }),
  blob: async (path, params) => {
    const res = await request("GET", path, { params, raw: true });
    return res.blob();
  }
};

// Fetches an authenticated PDF and either opens it in a new tab or downloads it
export async function getPdf(path, filename, mode = "open") {
  // Open the tab synchronously so pop-up blockers allow it
  const win = mode === "open" ? window.open("", "_blank") : null;
  try {
    const blob = await http.blob(path);
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}
