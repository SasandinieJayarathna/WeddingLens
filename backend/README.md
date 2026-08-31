# WeddingLens Backend

Express.js API that accepts a wedding-inspiration photo, runs it through the
trained EfficientNet-B3 model to detect the wedding style, and returns
matching vendor recommendations from PostgreSQL.

> **Prefer Docker?** All the setup below (Node, Python/TensorFlow, PostgreSQL) is
> also packaged as a container - see the root [README.md](../README.md#running-it-with-docker)'s
> "Running it with Docker" section for a one-command `docker compose up --build`
> alternative. This page covers running the backend directly on your own machine.

## Prerequisites

- Node.js (LTS) and npm
- PostgreSQL running locally (this project was built against PostgreSQL 16)
- The ML pipeline set up under `../ml-service/` with a trained model at
  `../ml-service/models/weddinglens_effnetb3.keras` (see `../ml-service/`
  scripts 01-09 - run those first, in order, if you haven't already)

## 1. Install dependencies

```bash
cd backend
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at least `DB_PASSWORD` to your local PostgreSQL password.
The `PYTHON_PATH` and `PREDICT_SCRIPT_PATH` defaults assume the standard
project layout (`ml-service/venv/Scripts/python.exe` on Windows) and usually
don't need to change.

## 3. Create the database and run the schema

Using `psql` (adjust the username if not `postgres`):

```bash
psql -U postgres -c "CREATE DATABASE weddinglens;"
psql -U postgres -d weddinglens -f db/schema.sql
```

## 4. Seed sample vendor data

```bash
psql -U postgres -d weddinglens -f db/seed.sql
```

This loads 180 real Sri Lankan wedding vendors (15 per category × 12 categories),
researched via public business directories and social media - not placeholder data.
Ratings/contact info/social links are only populated where a real one was actually
found (left `NULL` otherwise, never guessed); `wedding_style` is this project's own
editorial tagging, not each vendor's self-description. See `db/seed.sql`'s own header
comment for the full sourcing notes and honesty rules applied.

## 5. Start the server

```bash
npm start          # plain node
# or
npm run dev         # auto-restarts on file changes (node --watch)
```

The server listens on `http://localhost:5000` by default (override with
`PORT` in `.env`).

## API Endpoints

### `GET /api/health`
Simple liveness check. Returns `{ "status": "ok", "service": "weddinglens-backend" }`.

### `POST /api/predict`
Accepts a `multipart/form-data` upload with one or more files under the
**`images`** field (JPEG/PNG/WEBP, max size set by `MAX_UPLOAD_BYTES` in
`.env`, default 5MB each, up to 5 files per request - see
`MAX_IMAGES_PER_REQUEST` in `routes/predict.js`). Rate-limited to 10
requests/minute/IP.

If an `Authorization: Bearer <token>` header is sent (see `/api/auth/login`
below) and is valid, each saved prediction is linked to that user's account -
this is what populates `GET /api/profile/analyses`. The endpoint works fully
anonymously too; login is optional, not required, for the core feature.

Runs every image through `../ml-service/scripts/09_predict.py` as a **single**
subprocess invocation (see the comment at the top of `controllers/predictController.js`
for why - it loads the model once for the whole batch rather than once per
image), logs each result to the `predictions` table, and responds with:

**One image** - the prediction object directly (unchanged shape from the
original single-image API, so existing callers keep working):
```json
{
  "predicted_style": "boho_chic",
  "confidence": 0.8734,
  "all_scores": { "boho_chic": 0.8734, "rustic_barn": 0.0421, "...": "..." },
  "dominant_colors": ["#8A6E4B", "#F3E9DC", "#C9A66B", "...", "..."],
  "image_url": "/uploads/upload_169....jpg",
  "gradcam_url": "/uploads/upload_169..._gradcam.jpg"
}
```

`dominant_colors` is a real, photo-specific colour palette extracted from the
uploaded image itself (k-means clustering, weighted toward genuinely vivid colours -
see `../ml-service/scripts/09_predict.py`'s `extract_dominant_colors`), not a static
per-style reference. It's `[]` if extraction failed for that image, in which case the
frontend falls back to a static per-style palette.

**Two or more images** - wrapped in a `results` array of the same per-item shape
(used by the frontend's multi-image upload and style-comparison features):
```json
{ "results": [ { "predicted_style": "boho_chic", "...": "..." }, { "...": "..." } ] }
```

`gradcam_url` is the same photo with a heatmap overlay showing which regions
of the image most influenced the prediction (see
`../ml-service/scripts/gradcam_utils.py` for the explanation and
implementation). It can be `null` if heatmap generation failed for some
reason - the core prediction still succeeds either way. A per-image failure
(e.g. a corrupt file) produces `{ "error": "...", "original_filename": "..." }`
in that image's position without failing the rest of the batch.

### `GET /api/vendors?style=<style>`
`style` must be one of: `boho_chic`, `rustic_barn`, `luxury_glamour`,
`garden_floral`, `minimalist_modern`, `traditional_classic`.

Returns vendors for that style, grouped implicitly by category (the SQL
query orders by category then rating):

```json
{
  "style": "boho_chic",
  "count": 7,
  "vendors": [ { "id": 1, "name": "...", "category": "venue", "...": "..." } ]
}
```

### `GET /api/vendors?category=<category>`
`category` must be one of the 12 vendor categories: `venue`,
`photography_videography`, `decorator`, `florist`, `cake_artist`, `bridal_wear`,
`groom_wear`, `makeup_artist`, `jewellery`, `caterer`, `rental`, `wedding_planner`.

Returns every vendor in that category regardless of style (the general "browse
all vendors" flow, separate from the style-matching flow above), ordered by name:
```json
{ "category": "florist", "count": 15, "vendors": [ { "id": 1, "name": "...", "...": "..." } ] }
```

### `GET /api/vendors/categories`
Returns every vendor category with its vendor count, for the category-browsing
grid on `/vendors`:
```json
{ "categories": [ { "category": "venue", "count": 15 }, { "category": "florist", "count": 15 }, "..." ] }
```

### `POST /api/auth/register`
Body: `{ "email": "...", "password": "... (min 8 chars)", "displayName": "optional" }`.
Creates an account (bcrypt-hashed password) and returns `{ token, user }`.
Rate-limited to 20 attempts/15min/IP (shared with `/login`, brute-force protection).

### `POST /api/auth/login`
Body: `{ "email": "...", "password": "..." }`. Returns `{ token, user }` on
success, `401` with a deliberately generic "Incorrect email or password"
message on failure (so the endpoint can't be used to enumerate registered emails).

### `GET /api/auth/me`
Requires `Authorization: Bearer <token>`. Returns `{ "user": { "id", "email" } }`.

### `GET /api/profile/analyses`
Requires `Authorization: Bearer <token>`. Returns the logged-in user's
"inspiration board" - every prediction made while they were logged in:
```json
{ "count": 2, "analyses": [ { "id", "predicted_style", "confidence", "image_url", "gradcam_url", "created_at" } ] }
```

## Project structure

```
backend/
├── server.js              entry point - also serves /uploads and /vendor-images statically
├── routes/
│   ├── predict.js          POST /api/predict (single or multi-image)
│   ├── vendors.js          GET /api/vendors (?style= or ?category=), GET /api/vendors/categories
│   ├── auth.js             POST /api/auth/register, /login, GET /me
│   └── profile.js          GET /api/profile/analyses (inspiration board)
├── controllers/
│   ├── predictController.js   runs the Python inference script (batch-capable)
│   ├── vendorController.js    vendor DB queries (by style, by category, category counts)
│   └── authController.js      register/login logic (bcrypt hashing)
├── config/db.js            PostgreSQL connection pool
├── middleware/
│   ├── upload.js            multer config (file type/size validation)
│   └── auth.js               JWT verification (optionalAuth / requireAuth)
├── db/schema.sql           table definitions (vendors, predictions, users)
├── db/seed.sql             180 real Sri Lankan vendors across 12 categories
├── vendor-images/          real per-category vendor photos (11 of 12 categories;
│                            `venue` still uses a licensed Unsplash photo)
└── .env.example
```
