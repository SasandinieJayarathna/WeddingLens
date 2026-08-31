// In plain terms: the web address that returns "everything this logged-in
// user has uploaded before" - what the Dashboard page shows.
//
// GET /api/profile/analyses
// A logged-in user's "personalized inspiration board": every prediction made
// while they were logged in (see routes/predict.js, which links user_id when
// a valid token was sent). Requires login - there's nothing to show an
// anonymous visitor here.

const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const path = require("path");

const router = express.Router();

// Returns the logged-in user's past predictions, newest first, reshaped into
// the same { predicted_style, confidence, image_url, gradcam_url } shape the
// predict endpoint returns, so the frontend can reuse the same display code.
router.get("/analyses", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, uploaded_image_path, gradcam_image_path, predicted_style, confidence_score, created_at
       FROM predictions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    const analyses = result.rows.map((row) => ({
      id: row.id,
      predicted_style: row.predicted_style,
      confidence: Number(row.confidence_score),
      image_url: `/uploads/${path.basename(row.uploaded_image_path)}`,
      gradcam_url: row.gradcam_image_path ? `/uploads/${path.basename(row.gradcam_image_path)}` : null,
      created_at: row.created_at,
    }));

    return res.status(200).json({ count: analyses.length, analyses });
  } catch (err) {
    console.error("Fetching inspiration board failed:", err.message);
    return res.status(500).json({ error: "Could not load your inspiration board right now. Please try again." });
  }
});

module.exports = router;
