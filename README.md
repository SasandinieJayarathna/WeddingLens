# WeddingLens

WeddingLens is an AI-powered web app that identifies the aesthetic **style** of a
wedding from an inspiration photo — Boho Chic, Rustic/Barn, Luxury/Glamour,
Garden/Floral, Minimalist/Modern, or Traditional/Classic — and
recommends matching vendors for that style from a database of 180 real Sri Lankan
wedding vendors across 12
categories (venues, photography & videography, decorators, florists, cake artists,
bridal wear, groom's wear, makeup artists, jewellery, caterers, rentals, and wedding
planners). It also shows a **Grad-CAM heatmap** explaining which regions of the photo
drove the model's prediction, rather than just a black-box label.

This was built as a final-year BSc Software Development capstone project.

## How it works

```
   ┌──────────────┐      1. upload photo       ┌───────────────────┐
   │   Frontend   │ ─────────────────────────▶ │      Backend       │
   │ React + Vite │                             │  Node.js + Express │
   │  (port 5173) │ ◀───────────────────────── │     (port 5000)    │
   └──────────────┘   4. style + confidence     └─────────┬──────────┘
                          + Grad-CAM heatmap               │
                                                  2. spawns Python
                                                     subprocess
                                                            │
                                                            ▼
                                                 ┌────────────────────┐
                                                 │    ml-service       │
                                                 │ EfficientNet-B3     │
                                                 │ (TensorFlow/Keras)  │
                                                 │ + Grad-CAM          │
                                                 └────────────────────┘
                          3. vendor lookup
   ┌──────────────┐ ◀───────────────────────── ┌───────────────────┐
   │  PostgreSQL   │                            │      Backend       │
   │  weddinglens  │ ─────────────────────────▶ │                    │
   └──────────────┘        vendor rows          └───────────────────┘
```

- **ml-service/**: Python pipeline — dataset collection (Unsplash API), cleaning,
  train/val/test split, EfficientNet-B3 transfer-learning training, evaluation, and
  Grad-CAM explainability. See `ml-service/models/model_summary.txt` for real results.
- **backend/**: Express API. `POST /api/predict` runs an uploaded photo through the
  trained model (as a Python subprocess) and returns the predicted style + a Grad-CAM
  overlay; `GET /api/vendors?style=<style>` returns matching vendors from PostgreSQL.
- **frontend/**: React (Vite) app — upload a photo, see the predicted style with its
  heatmap, then browse recommended vendors grouped by category.
- **docs/**: testing checklist, security notes, and dissertation chapter drafts.

## Feature set (per the project proposal)

- **Image upload and analysis** — single or multi-image upload (up to 5 at once),
  each with its own per-class confidence scores.
- **Style dashboard** — each prediction is shown with keywords, a decor suggestion
  for the detected style, and a **colour palette extracted from the actual uploaded
  photo** (k-means clustering over its real pixels, weighted to surface genuinely
  vivid/meaningful colours rather than blurry background/shadow tones — see
  `ml-service/scripts/09_predict.py`'s `extract_dominant_colors`), falling back to a
  static per-style reference palette (`frontend/src/data/styleInfo.js`) only if
  extraction ever fails for a given image.
- **Grad-CAM explainability** — a heatmap overlay on every prediction showing which
  regions of the photo drove the classification.
- **Vendor matching** — recommended vendors, grouped by category, for the detected
  style (`/vendors/style/:style`), drawn from a database of 180 real Sri Lankan
  vendors researched via public directories/social media, with honest sourcing
  (no fabricated ratings or contact info — see `backend/db/seed.sql`'s header).
- **General vendor browsing** — a separate `/vendors` tab lets you browse every
  vendor by category (not tied to a prediction), each with real Instagram/Facebook/
  TikTok/website links where one was found.
- **Style comparison** — upload two images and see their style breakdowns side by
  side, with a plain-language summary of how they compare (`/compare`).
- **User accounts and inspiration board** — optional email/password accounts
  (JWT-based); logging in automatically saves every analysis to a personal
  dashboard (`/profile`) with stat summaries you can revisit later. The core
  classifier works fully anonymously - an account is only needed to keep history.

## Current results (real numbers, not projected)

- Dataset: 1,200 raw images → 1,181 cleaned (98.4% retention) → 824 train / 178 val /
  179 test, across the 6 generic-aesthetic categories (`boho_chic`, `rustic_barn`,
  `luxury_glamour`, `garden_floral`, `minimalist_modern`, `traditional_classic`),
  all bulk-collected via the Unsplash API, 192–200 cleaned images each — no severely
  under-represented class.
- Model: EfficientNet-B3 transfer learning, CPU-only training (no native TensorFlow
  GPU support on Windows for TF ≥ 2.11) — **55.31% test accuracy**. Per-class F1
  ranges from 0.66 (`garden_floral`) down to 0.47 (`boho_chic`/`luxury_glamour`).
  `EarlyStopping` never triggered (training ran the full fixed 20-epoch CPU-practical
  budget); a later experiment with a wider budget scored *worse* (53.63%), a genuine
  reported negative result. See `ml-service/models/evaluation_report.txt` and
  `model_summary.txt` for the full breakdown, `docs/04_results_and_evaluation.md` for
  the full analysis, and `docs/testing_checklist.md`/`docs/security_notes.md` for
  integration testing and security review results.
- **Taxonomy history**: a 5-class Sri Lankan wedding-market-specific taxonomy
  (`sinhala_kandyan`, `tamil_hindu_traditional`, `western_white`, `modern_fusion`,
  `indian_influenced`) was tried partway through the project, then reverted back to
  this original 6-class set at the project owner's request, to stay aligned with the
  formal proposal. That taxonomy's own dataset/model (52.07%/54.17% test accuracy
  across two runs, with a complete `sinhala_kandyan` classification failure) are
  preserved for reference at `ml-service/archive_5class_taxonomy/`, not deleted — see
  `docs/03_methodology.md` §3.1.1 for the full story.

## Running it with Docker

```bash
cp .env.example .env    # fill in a real DB_PASSWORD and JWT_SECRET
docker compose up --build
```

Then open `http://localhost:5173`. This brings up PostgreSQL (schema + real vendor
seed data loaded automatically), the backend (Node.js + a Python/TensorFlow venv in
one container), and the frontend (built and served via nginx) - see
`docker-compose.yml`, `backend/Dockerfile`, and `frontend/Dockerfile`.

This has been build-verified live: `docker compose up --build` brings up all three
containers cleanly, and a real prediction end-to-end through the containerized
backend (classification, colour palette, Grad-CAM heatmap, DB logging), all 180
vendor cards showing their real supplied photos, and the frontend's client-side
routing (via nginx's SPA fallback) were all confirmed working - see
`docs/03_methodology.md` §3.5.2 for the full write-up (Docker was listed in the
original project proposal but not used during initial development; this closes
that gap).

> The `db` service intentionally does NOT publish a host port by default, so it
> never collides with a native PostgreSQL install on the usual 5432 (the
> backend-to-database connection always happens over Docker's internal network,
> regardless). If you want direct `psql`/GUI access to the containerized database,
> see `docker-compose.override.yml` (already in this repo) - it adds an optional
> mapping on port 5433. Compose merges `ports` lists ADDITIVELY across files, not
> by replacing, so don't add "5432:5432" back to the base file without also
> removing it from the override, or you'll recreate the exact collision this setup
> avoids.

> **Don't run this alongside the manual/local setup below at the same time.** The
> `frontend` service here publishes host port 5173 - the same default port Vite's own
> dev server uses - and has `restart: unless-stopped`, so leftover containers can come
> back up on their own (e.g. after a Docker Desktop restart) and silently collide with
> a native `npm run dev` server already using that port. Run `docker compose down`
> before starting the manual setup, or vice versa.

If you'd rather run each piece directly on your own machine (useful for actively
developing the ML pipeline, or if Docker isn't available), see the manual setup below.

## Running it locally from scratch

### 1. ml-service (Python / TensorFlow)

```bash
cd ml-service
python -m venv venv
venv/Scripts/activate          # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Add your own Unsplash API key to `ml-service/.env` (see `ml-service/scripts/01_collect_dataset.py`
for setup instructions) if you want to re-run dataset collection. To reproduce the
full pipeline from scratch, run scripts `01` through `10` in `ml-service/scripts/` in
order. If you already have a trained model at
`ml-service/models/weddinglens_effnetb3.keras`, you can skip straight to the backend.

### 2. backend (Node.js / Express / PostgreSQL)

See `backend/README.md` for full details. Short version:

```bash
cd backend
npm install
cp .env.example .env    # then edit DB_PASSWORD etc.
psql -U postgres -c "CREATE DATABASE weddinglens;"
psql -U postgres -d weddinglens -f db/schema.sql
psql -U postgres -d weddinglens -f db/seed.sql
npm start
```

Backend runs on `http://localhost:5000`.

### 3. frontend (React / Vite)

```bash
cd frontend
npm install
cp .env.example .env    # points at the backend's URL, defaults to localhost:5000
npm run dev
```

Frontend runs on `http://localhost:5173`. It opens on a landing page with the
WeddingLens brand mark (`frontend/src/components/Logo.jsx`); from there, sign up,
log in, or continue as a guest, upload a wedding inspiration photo, and try the full
flow: prediction → colour palette + Grad-CAM heatmap → matching vendors.

## Project structure

```
WeddingLens/
├── CLAUDE.md              project context/history for AI-assisted development
├── docker-compose.yml     brings up db + backend + frontend together (see above)
├── ml-service/            Python ML pipeline (see ml-service/scripts/)
│   ├── data/              raw/cleaned/train/val/test images
│   ├── scripts/           01-10, run in order to reproduce the pipeline
│   ├── notebooks/         real reference photos supplied per vendor category
│   └── models/            trained model + evaluation outputs
├── backend/               Express API (see backend/README.md)
│   ├── Dockerfile
│   └── vendor-images/     real per-category vendor photos, served statically
├── frontend/              React/Vite app (see frontend/README.md)
│   └── Dockerfile
└── docs/                  testing checklist, security notes, dissertation chapters
```

## Known limitations

- Training ran CPU-only (no native TensorFlow GPU support on Windows for TF ≥ 2.11),
  which constrained realistic epoch counts/dataset size for this project's timeframe
  and is the direct cause of `EarlyStopping` never triggering (training was cut off
  by a fixed 20-epoch budget, not genuine convergence).
- All 6 classes (134–140 images/class in training) are modest by production
  standards, which caps how well the model generalises overall (55.31% test
  accuracy) - though no single class is severely under-represented, unlike a later,
  reverted 5-class taxonomy experiment's `sinhala_kandyan` class (see
  `ml-service/archive_5class_taxonomy/`).
- `boho_chic`→`traditional_classic` and `luxury_glamour`↔`minimalist_modern` are the
  model's dominant confusion patterns, with `garden_floral` acting as a common
  "sink" class other categories' errors drift toward - see
  `docs/04_results_and_evaluation.md` §4.3 for the full confusion-matrix analysis.
- The backend spawns a fresh Python process per prediction rather than running a
  persistent inference service — simple and fine for occasional use, but not
  suited to high request volume (see `docs/security_notes.md`).

See `docs/05_conclusion_and_future_work.md` for a fuller discussion.
