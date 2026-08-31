// In plain terms: turns a photo's saved path into a real, clickable URL a
// browser can load - handles both "it's already a full web link" and "it's
// a short path our own server needs a prefix added to" cases.
//
// Shared helper for resolving an image URL that might be either an absolute
// external URL (e.g. Unsplash) or a relative path served by our own backend
// (e.g. /vendor-images/... or /uploads/...). Used anywhere a vendor/category
// image or an uploaded prediction image is rendered.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Passes external URLs through unchanged; prefixes our own relative paths
// with the backend's base URL so an <img src> works regardless of which kind
// it got.
export function resolveMediaUrl(url) {
  if (!url) return url;
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}
