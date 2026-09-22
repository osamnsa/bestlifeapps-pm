import axios from "axios";

// Defaults to "/api" for local dev (proxied by Vite) and for any deployment
// where the frontend and backend share one origin. Set VITE_API_BASE_URL at
// build time when they're on separate origins/services (e.g. Render, where
// the frontend is a Static Site and the backend is its own Web Service).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }
      if (isRefreshing) {
        await new Promise<void>((resolve) => queue.push(resolve));
        return api(original);
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
        localStorage.setItem("access_token", data.access);
        queue.forEach((cb) => cb());
        queue = [];
        return api(original);
      } catch (e) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
