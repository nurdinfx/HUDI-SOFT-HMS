import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// For public access, we might need a visitor token if the backend requires it.
// If the backend is modified to allow public access, this won't be needed.
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("visitor_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
