import axios from "axios";

// const API_URL = import.meta.env.VITE_API_URL || ""; // http://localhost:3001 or https://localhost:3001 for localhost without nginx
const API_URL = "";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
