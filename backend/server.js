// In plain terms: this file starts the backend server. It sets up all the
// API routes (predict, vendors, auth, profile), turns on security/rate-limit
// protections, and starts listening for requests from the frontend.
//
// WeddingLens backend entry point.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const predictRoutes = require("./routes/predict");
const vendorRoutes = require("./routes/vendors");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded images statically so the frontend can display, e.g., the
// image a Grad-CAM overlay was generated from if needed.
app.use("/uploads", express.static("uploads"));

// User-supplied real reference images for vendor category cards (one folder
// per category, e.g. vendor-images/bridal_wear/*.jpg) - NOT scraped by
// Claude; these were supplied directly by the project owner as local files
// (see ml-service/notebooks/<Category>/ for the originals) specifically
// because reliably/safely scraping real vendor photos from Instagram/
// Pinterest isn't possible (session-gated, expiring URLs, unclear
// licensing - see CLAUDE.md). Distinct from /uploads (user prediction
// photos) and from the Unsplash-sourced categories that don't have local
// images yet.
app.use("/vendor-images", express.static("vendor-images"));

// Simple liveness check - lets a developer (or a future uptime monitor)
// confirm the backend is up without hitting any real feature.
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "weddinglens-backend" });
});

app.use("/api/predict", predictRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// 404 handler for anything that didn't match a route above.
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralised error handler - catches anything thrown/passed to next(err)
// that individual routes didn't already handle, so the client always gets
// clean JSON instead of an HTML stack trace.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`WeddingLens backend listening on http://localhost:${PORT}`);
});
