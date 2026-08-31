// In plain terms: every page uses THIS to talk to the backend, instead of
// each page writing its own fetch code. Import `api` and call api.get(...)
// or api.post(...) like you would with fetch, but with the backend URL and
// a login token (if any) already attached automatically.
//
// Single shared axios instance, configured from the VITE_API_BASE_URL env
// variable (see .env / .env.example) so the frontend never hardcodes the
// backend's address - it can be pointed at a different host for
// staging/production without touching component code.

import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const api = axios.create({
  baseURL,
  // The backend spawns a fresh Python process per prediction (loads
  // TensorFlow + the model from scratch every time - see
  // backend/controllers/predictController.js), which can take well over
  // 30s on a CPU-only machine. Match the backend's own 90s ceiling here so
  // the frontend doesn't give up before the backend does.
  timeout: 95000,
});

export default api;
