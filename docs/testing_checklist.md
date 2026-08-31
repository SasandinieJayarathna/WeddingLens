# WeddingLens — Integration Testing Checklist

This checklist was run manually against the real backend (Node/Express + PostgreSQL),
the real trained model (`ml-service/models/weddinglens_effnetb3.keras`, test accuracy
55.31%), and the real frontend (React/Vite) on 2026-08-20/21, after Phase 2 (model
training) completed. Results below are the actual output observed, not projected.

## How it was run

- Backend started with `node server.js` against the live `weddinglens` PostgreSQL database.
- Requests sent with `curl` directly against `POST /api/predict` and `GET /api/vendors`
  (equivalent to what the frontend's axios calls send).
- Frontend started with `npm run dev` (Vite) and each route's module fetched directly to
  confirm it transforms/compiles without error (a proxy for "loads without console errors"
  in the absence of an actual browser in this environment).

## Functional tests

| # | Test | Result |
|---|------|--------|
| 1 | `GET /api/health` returns 200 | ✅ `{"status":"ok","service":"weddinglens-backend"}` |
| 2 | Upload a real photo to `POST /api/predict` | ✅ Returned `predicted_style: "garden_floral"` (correct — the test image was from the garden_floral test set), `confidence: 0.3023`, `image_url`, and `gradcam_url` |
| 3 | Uploaded image is retrievable via `image_url` | ✅ 200, 178,356 bytes |
| 4 | Grad-CAM heatmap is retrievable via `gradcam_url` | ✅ 200, 38,775 bytes |
| 5 | Prediction is logged to the `predictions` table | ✅ Row present with correct `predicted_style`/`confidence_score`/`created_at` |
| 6 | `GET /api/vendors?style=rustic_barn` returns matching vendors | ✅ 200, 7 vendors, one per category (venue/photographer/decorator/florist/caterer/makeup_artist/wedding_planner) |
| 7 | Frontend UploadPage/ResultsPage/VendorsPage modules load without transform errors | ✅ All returned 200 from Vite's dev server |

## Edge cases

| # | Test | Result |
|---|------|--------|
| 1 | Upload a non-image file (`.txt`) | ✅ 400, `{"error":"Only JPEG, PNG, or WEBP image files are allowed."}` |
| 2 | `POST /api/predict` with no file attached | ✅ 400, `{"error":"No image file was uploaded. Send it as form field 'image'."}` |
| 3 | Upload a file over the 5MB limit | ✅ 400, `{"error":"File too large"}` |
| 4 | `GET /api/vendors` with an invalid style value | ✅ 400, lists the 6 valid styles in the error message |
| 5 | `GET /api/vendors` with no `style` query param | ✅ 400, `{"error":"Missing required query parameter: style"}` |
| 6 | Unknown route (`GET /api/nonsense`) | ✅ 404, `{"error":"Route not found: GET /api/nonsense"}` |
| 7 | No vendors for a style | Not directly reproducible with current seed data (every style has 7 vendors), but `vendorController.js` returns an empty array + `count: 0` rather than erroring, and `VendorsPage.jsx` renders a friendly "No vendors found yet" message in that case — verified by code review, not a live empty-result test. |
| 8 | Backend unreachable from frontend | Verified by code review: `axiosInstance.js`/`UploadPage.jsx`/`VendorsPage.jsx` catch the no-`err.response` case and show "Couldn't reach the WeddingLens server. Is the backend running?" instead of a raw error. Not exercised live (would require deliberately killing the backend mid-session). |

## Additional feature tests (auth, multi-image, comparison, inspiration board)

Added after the project proposal (`.claude/CL_BSCSD_32_57_CIS_6002.docx`) introduced
multi-image upload, style comparison, and user profiles as required features. Run
against the real backend/database on 2026-08-21.

| # | Test | Result |
|---|------|--------|
| 1 | Register a new account | ✅ 201, returns `{ token, user }` |
| 2 | Log in with correct credentials | ✅ 200, returns a valid JWT |
| 3 | `GET /api/auth/me` with that token | ✅ 200, returns the correct user |
| 4 | Register with an already-used email | ✅ 400, "An account with that email already exists." |
| 5 | Log in with the wrong password | ✅ 401, generic "Incorrect email or password." (does not reveal whether the email exists) |
| 6 | `GET /api/profile/analyses` with no token | ✅ 401, "Login required for this action." |
| 7 | `GET /api/profile/analyses` with a valid token, no history yet | ✅ 200, `{"count":0,"analyses":[]}` |
| 8 | Single-image predict while logged in | ✅ 200, correct prediction (`rustic_barn`), and the prediction appeared on that user's `/api/profile/analyses` afterwards |
| 9 | 2-image predict (style comparison) | ✅ 200, `{"results":[...]}` with 2 correct predictions (`garden_floral`, `luxury_glamour`) in ~15s total — faster than 2 separate single-image calls would be (~35s each), confirming the single-model-load-per-batch design works as intended |
| 10 | 3-image predict while logged in | ✅ 200, 3 results (2 correct, 1 misclassified - consistent with overall model accuracy), and all 3 appeared on the user's inspiration board afterwards with correct `user_id` linkage confirmed directly in the database |

## Known limitations surfaced during testing

- The backend spawns a **fresh Python process per prediction** (see
  `backend/controllers/predictController.js`), so every request pays the cost of
  importing TensorFlow and loading the model from disk, not just the first one.
  Timeouts were widened to 90s (backend) / 95s (frontend) to accommodate this — see
  the comments in `predictController.js` and `axiosInstance.js`. If this app ever needs
  to handle real concurrent traffic, this should be replaced with a persistent
  Python microservice that keeps the model loaded in memory.
- Model accuracy (55.31% test, original 6-class taxonomy) means roughly 4 in 9
  uploaded photos will be misclassified. This is disclosed to the user via the
  confidence breakdown shown on ResultsPage, not hidden.

## Re-verification after the Sri Lankan-market taxonomy retrain (2026-08-30/31)

Run against the retrained 5-class model (`sinhala_kandyan`, `tamil_hindu_traditional`,
`western_white`, `modern_fusion`, `indian_influenced` — 54.17% test accuracy, see
`docs/04_results_and_evaluation.md`) and the re-tagged live vendor database, to confirm
the full system still works end-to-end after the cutover — not assumed from the code
changes alone.

| # | Test | Result |
|---|------|--------|
| 1 | `GET /api/health` returns 200 | ✅ `{"status":"ok","service":"weddinglens-backend"}` |
| 2 | `GET /api/vendors/categories` (DB connectivity + retagged data) | ✅ 200, all 12 categories, 15 vendors each |
| 3 | Upload a real `western_white` test photo to `POST /api/predict` | ✅ 200, `predicted_style: "western_white"` (correct), `confidence: 0.3573`, real `dominant_colors`, `image_url`, `gradcam_url` |
| 4 | Grad-CAM heatmap retrievable via `gradcam_url` | ✅ 200 |
| 5 | Prediction logged to the `predictions` table | ✅ Row present with correct `predicted_style`/`confidence_score` |
| 6 | `GET /api/vendors?style=western_white` returns matching vendors | ✅ 200, 36 vendors (3 per category × 12 categories, matching the new 5-way even split), all correctly tagged `western_white` |
| 7 | `sinhala_kandyan` on a real Kandyan test photo, via `09_predict.py` directly | Ran successfully (no crash) but predicted `indian_influenced` (incorrect) — consistent with, and a live confirmation of, the 0% recall found in the formal test-set evaluation (§4.2). Not a bug: this is the model genuinely never predicting that class, exactly as measured. |
| 8 | Frontend loads (`npm run dev`) | ✅ 200 from Vite's dev server |
| 9 | Frontend production build | ✅ `npm run build` compiles clean, no errors |
| 10 | Backend module sanity check (`vendorController.isValidStyle`) | ✅ `isValidStyle('sinhala_kandyan')` → `true`, `isValidStyle('boho_chic')` (old taxonomy) → `false` |

**One latency observation worth recording**: the very first `POST /api/predict` request
after a fresh backend start (cold TensorFlow import + model load) took long enough that
a 30-second `curl --max-time` client-side timeout was hit — but the request **completed
successfully server-side anyway** (confirmed via the logged `predictions` row) and a
second request immediately after completed client-side in ~14s. This is consistent with
the already-known subprocess cold-start cost (see the limitation above) rather than a
new issue, but is a reminder that a very first request after a deploy/restart can be
slower than the 90s backend timeout might suggest is "normal" — comfortably within it,
but worth knowing about.

Test data from this round (2 prediction rows, their uploaded images/Grad-CAM overlays)
was deleted from the database and `backend/uploads/` afterward — verified empty
(`SELECT COUNT(*) FROM predictions` → 0, `uploads/` → 0 files).

## Re-verification after reverting to the original 6-class taxonomy (2026-08-31)

The 5-class Sri Lankan-market taxonomy above was reverted back to the original
6-class generic-aesthetic taxonomy (`boho_chic`, `rustic_barn`, `luxury_glamour`,
`garden_floral`, `minimalist_modern`, `traditional_classic` — 55.31% test accuracy,
restored from `ml-service/archive_6class_taxonomy/`) at the project owner's request,
to stay aligned with the formal project proposal. Run against the restored model and
the re-tagged live vendor database to confirm the full system still works end-to-end
after the revert - not assumed from the code changes alone.

| # | Test | Result |
|---|------|--------|
| 1 | `09_predict.py` run directly against a real `boho_chic` test photo | ✅ `predicted_style: "boho_chic"` (correct), `confidence: 0.2335`, real `dominant_colors`, `gradcam_filename` — confirms the restored `.keras` model + `class_names.json` load and predict correctly |
| 2 | `GET /api/vendors?style=boho_chic` (post-retag) | ✅ 200, 36 vendors (3 per category × 12 categories) |
| 3 | `GET /api/vendors?style=sinhala_kandyan` (old 5-class style, should now be rejected) | ✅ 400, `{"error":"Invalid style \"sinhala_kandyan\". Must be one of: boho_chic, rustic_barn, luxury_glamour, garden_floral, minimalist_modern, traditional_classic"}` |
| 4 | Upload a real `boho_chic` test photo to `POST /api/predict` (full live path, after backend restart to pick up the reverted `VALID_STYLES`) | ✅ 200, `predicted_style: "boho_chic"`, `confidence: 0.2335`, real `dominant_colors`, `image_url`, `gradcam_url` |
| 5 | Frontend production build | ✅ `npm run build` compiles clean, no errors |
| 6 | Backend module sanity check (`vendorController.isValidStyle`) | ✅ `isValidStyle('boho_chic')` → `true`, `isValidStyle('sinhala_kandyan')` (old taxonomy) → `false` |

Test data from this round (1 prediction row, its uploaded image/Grad-CAM overlay)
was deleted from the database and `backend/uploads/` afterward. Two other upload
pairs already present in `backend/uploads/` from the user's own earlier live use of
the app (a real style comparison, visible in a screenshot shared during this
session) were deliberately left alone — they are real usage, not test artifacts.
