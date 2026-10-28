import axios from "axios";

export const BACKEND_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("krishimart_access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically refresh expired access token using refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("krishimart_refresh")
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(`${BACKEND_URL}/api/accounts/token/refresh/`, {
          refresh: localStorage.getItem("krishimart_refresh"),
        });
        const newAccess = refreshRes.data.access;
        localStorage.setItem("krishimart_access", newAccess);
        if (refreshRes.data.refresh) {
          localStorage.setItem("krishimart_refresh", refreshRes.data.refresh);
        }
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem("krishimart_access");
        localStorage.removeItem("krishimart_refresh");
      }
    }
    return Promise.reject(error);
  }
);

export default api;