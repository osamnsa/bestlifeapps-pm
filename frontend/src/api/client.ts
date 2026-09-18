import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
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
        const { data } = await axios.post("/api/auth/token/refresh/", { refresh });
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
