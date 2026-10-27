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

export default api;