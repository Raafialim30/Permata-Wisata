/**
 * config.js — Konfigurasi terpusat untuk seluruh aplikasi Frontend.
 */

const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, "")
  : process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "";

export default API_BASE_URL;