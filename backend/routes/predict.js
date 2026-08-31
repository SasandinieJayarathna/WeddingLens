// In plain terms: this is the web address the frontend calls when someone
// uploads photo(s) - it saves the files, asks the AI model for a prediction,
// stores the result in the database, and sends the answer back.
//
// POST /api/predict
// Accepts one or more image uploads (field name "images"), runs each through
// the trained model via controllers/predictController.js, logs each result
// to the database, and returns the prediction(s) + confidence + Grad-CAM
// heatmap URL(s) to the caller.
//
// Response shape depends on how many images were sent, so existing single-image
// callers (the ResultsPage flow) keep working unchanged:
//   - 1 image  -> the prediction object directly at the top level (unchanged
//                 from the original single-image API)
//   - 2+ images -> { results: [ <prediction object>, ... ] }, same per-item
//                  shape, used by the multi-image upload and style-comparison
//                  features (see frontend MultiResultsPage/ComparePage)
//
// If a user is logged in (a valid Bearer token was sent - see
// middleware/auth.js's optionalAuth), each saved prediction is linked to
// their account via user_id, which is what populates their "inspiration
// board" on the profile page. Anonymous uploads still work exactly as before.

const express = require("express");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");
const upload = require("../middleware/upload");
const { optionalAuth } = require("../middleware/auth");
const { runPredictions } = require("../controllers/predictController");

const router = express.Router();

const MAX_IMAGES_PER_REQUEST = 5;

// Each prediction spawns a full Python/TensorFlow process (see
// predictController.js) - that's expensive enough that an unthrottled
// endpoint is a resource-exhaustion risk even without malicious intent
// (e.g. a user double-clicking "submit" repeatedly). 10 requests/minute per
// IP is generous for a real user, but stops runaway/accidental hammering.
const predictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many prediction requests. Please wait a moment and try again." },
});

// Handles the whole upload -> predict -> log -> respond pipeline for 1-5
// images in a single request (see the file header comment for the two
// response shapes this can return).
router.post("/", predictLimiter, optionalAuth, (req, res) => {
  // upload.array(...) is called manually (rather than as route middleware)
  // so multer's own errors (bad file type, too large, too many files) can be
  // caught here and turned into a clean JSON response instead of Express's
  // default HTML error page.
  upload.array("images", MAX_IMAGES_PER_REQUEST)(req, res, async (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ error: multerErr.message });
    }
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No image file was uploaded. Send it as form field 'images'." });
    }

    let predictions;
    try {
      predictions = await runPredictions(files.map((f) => f.path));
    } catch (err) {
      console.error("Prediction failed:", err.message);
      // The whole batch failed to run at all (e.g. Python/model missing) -
      // clean up every uploaded file, there's nothing to keep.
      files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(500).json({ error: "Prediction failed. Please try again with a different image." });
    }

    const responseItems = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = predictions[i] || { error: "No result returned for this image." };

      if (result.error) {
        // This specific image failed (bad file content, etc.) - clean up
        // just this file and report the error for this item only; other
        // images in the same batch are unaffected.
        fs.unlink(file.path, () => {});
        responseItems.push({ error: result.error, original_filename: file.originalname });
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO predictions (uploaded_image_path, gradcam_image_path, predicted_style, confidence_score, user_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            file.path,
            result.gradcam_filename ? path.join(path.dirname(file.path), result.gradcam_filename) : null,
            result.predicted_style,
            result.confidence,
            req.user ? req.user.id : null,
          ]
        );
      } catch (dbErr) {
        // Logging the prediction failed, but the prediction itself succeeded -
        // still return it to the user rather than failing the whole request
        // over a logging problem.
        console.error("Logging prediction to DB failed:", dbErr.message);
      }

      const gradcamUrl = result.gradcam_filename ? `/uploads/${result.gradcam_filename}` : null;
      responseItems.push({
        predicted_style: result.predicted_style,
        confidence: result.confidence,
        all_scores: result.all_scores,
        // Real palette extracted from THIS photo (see 09_predict.py's
        // extract_dominant_colors) - falls back to [] if extraction failed,
        // in which case the frontend shows the style's static reference
        // palette instead (see PredictionCard.jsx).
        dominant_colors: result.dominant_colors || [],
        image_url: `/uploads/${file.filename}`,
        gradcam_url: gradcamUrl,
      });
    }

    if (responseItems.length === 1) {
      const only = responseItems[0];
      const status = only.error ? 400 : 200;
      return res.status(status).json(only);
    }
    return res.status(200).json({ results: responseItems });
  });
});

module.exports = router;
