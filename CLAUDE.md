# WeddingLens — Project Context

## What this project is
Final-year BSc Software Development capstone (formal project proposal:
`.claude/CL_BSCSD_32_57_CIS_6002.docx` — "WeddingLens: A Deep Learning-Based Wedding
Style Classification and Vendor Recommendation System Using CNNs", student CL/BSCSD/32/57).
An AI-powered web app that:
1. Lets users upload one or more wedding inspiration images
2. Classifies the wedding style using a deep learning model (EfficientNet-B3, transfer learning)
3. Shows Grad-CAM explainability heatmaps (which image regions drove the prediction)
4. Recommends matching vendors (venues, photographers, decorators, florists, caterers, makeup artists, wedding planners) based on the detected style
5. Shows a "style dashboard" (colour palette + keywords + decor suggestion) per detected style
6. Lets users compare two images' styles side by side (`/compare`)
7. Lets users optionally create an account to save past analyses to a personal
   "inspiration board" (`/profile`) — login is optional, not required, for the core feature

## Style categories (6 classes — original proposal's generic-aesthetic taxonomy)
boho_chic, rustic_barn, luxury_glamour, garden_floral, minimalist_modern, traditional_classic

**Note on taxonomy history**: this is the ORIGINAL 6-class taxonomy per the formal project
proposal (`.claude/CL_BSCSD_32_57_CIS_6002.docx`) — Phase 1/2's 55.31%-accuracy model. Per the
user's request (2026-08-30), this was temporarily replaced with a 5-class Sri Lankan
wedding-market-specific taxonomy (sinhala_kandyan, tamil_hindu_traditional, western_white,
modern_fusion, indian_influenced — see "Post-proposal-extension #14" below for that full
retaxonomy story: data sourcing, the honest 32/37-image shortfall on sinhala_kandyan, and the
full system cutover). **That taxonomy was then reverted back to this original 6-class set**, per
the user's follow-up request (2026-08-31), to stay aligned with the formal proposal document —
see "Post-proposal-extension #16" below for the full revert story. The 5-class taxonomy's own
dataset/model are preserved, not deleted, at ml-service/archive_5class_taxonomy/; the original
6-class dataset/model remain archived (also not deleted, and now restored as the live system)
at ml-service/archive_6class_taxonomy/.

## Tech stack
- ML: Python, TensorFlow/Keras, EfficientNet-B3, OpenCV, scikit-learn, Grad-CAM
- Backend: Node.js, Express.js, PostgreSQL
- Frontend: React.js (Vite)
- Dev tools: VS Code, Claude Code, GitHub
- Containerisation: Docker (docker-compose.yml + backend/Dockerfile + frontend/Dockerfile)

**Note on deviation from the formal proposal**: the proposal (`.claude/CL_BSCSD_32_57_CIS_6002.docx`
§5/§8) listed **Flask** for the backend; the system was actually built with
**Node.js/Express** instead (a deliberate choice made early on, functionally
interchangeable for what this backend does - see docs/03_methodology.md §3.5.1 for
the full justification, added 2026-08-25 after this deviation was flagged by a
review). Docker was also listed as a resource but not used during initial
development - this was added post-proposal, see extension #11 below.

## Project structure (deviates from the original master-guide naming — see note below)
WeddingLens/
├── CLAUDE.md
├── ml-service/
│   ├── venv/              (Python virtual environment)
│   ├── data/
│   │   ├── raw/<category>/        (crawled images, uncleaned)
│   │   ├── cleaned/<category>/    (deduped, validated, renamed)
│   │   ├── train/<category>/
│   │   ├── val/<category>/
│   │   └── test/<category>/
│   ├── scripts/
│   ├── models/
│   └── notebooks/
├── backend/
├── frontend/
└── docs/

**Naming note:** The original planning doc (WeddingLens_ClaudeCode_MasterGuide.md) refers to an
`ml/` folder with `ml/dataset/{raw,cleaned,split/{train,val,test}}`. This project already had an
`ml-service/` folder with `ml-service/data/{raw,train,val,test}` partially built (some raw images
already crawled) before Claude Code started, so that naming was kept and a `cleaned/` stage was
added to match it. Wherever future instructions say `ml/dataset/...`, read it as `ml-service/data/...`.

## Environment specifics (this machine)
- Windows 11, PowerShell primary shell, Bash tool also available (Git Bash/POSIX).
- Python 3.11.9. Project venv at ml-service/venv — use ml-service/venv/Scripts/python.exe
  (or activate it) for all ML scripts, not the system Python.
- Node.js LTS installed via winget specifically for this project (Phase 3/4).
- PostgreSQL 16 already installed and running as a Windows service (postgresql-x64-16).
- GPU: NVIDIA GeForce MX550 present, but native TensorFlow GPU support on Windows was dropped
  after TF 2.10 — training runs on CPU. Keep epoch counts/batch sizes realistic for CPU training
  and mention this as a methodology/limitations note in the dissertation.
- Not a git repository (no git init done yet).
- Docker Desktop installed (2026-08-25, via WSL2 backend - Windows 11 Home doesn't
  have Hyper-V, so `wsl --install` was run first). `docker compose up --build`
  works. The native PostgreSQL Windows service occupies port 5432, so the
  containerized `db` service needs its host port remapped (see
  docker-compose.override.yml, gitignored) - doesn't affect the backend<->db
  connection, which is internal Docker networking either way.
- **Docker Desktop's engine can hang after a machine restart** even though its
  processes still show as running - symptom is `docker ps`/`docker compose ps`
  failing with "Docker Desktop is unable to start". Fix: kill the Docker
  processes (`Docker Desktop.exe`, `com.docker.backend.exe`, `com.docker.build.exe`)
  and relaunch via `explorer.exe "shell:AppsFolder\Docker.DockerForWindows.Settings"`
  (its actual `Program Files` path isn't reliably discoverable by search on this
  machine - `Get-StartApps` is what resolved the launchable AppID). Give it a few
  seconds after relaunch before `docker ps` responds. Not a project bug, a recurring
  environment quirk - see extension #14 and #15.
- **Never run `docker compose up` and the native `npm run dev` frontend at the same
  time.** `docker-compose.yml`'s `frontend` service publishes host port 5173 (same
  default port Vite's dev server uses) AND has `restart: unless-stopped` - so if
  Docker containers were left up, a Docker Desktop relaunch (e.g. after the hang
  above) brings the container back automatically and it silently races the native
  dev server for `:5173`. Which one actually answers `localhost:5173` is then
  OS-dependent (IPv6-loopback vs IPv4-any socket resolution) and can flip
  unpredictably. Run one stack or the other, not both - `docker compose down`
  before starting native dev, or stop native dev before `docker compose up`.

## User context
Beginner-level ML/full-stack developer. Explain what each script does in comments.
Always print clear progress/summary output so results are visible without needing
to inspect files manually. Never silently fail — surface errors clearly.

## Current phase
Phase 1 complete — dataset collected via the Unsplash API (not Google/Bing image scraping;
icrawler's GoogleImageCrawler and BingImageCrawler both proved broken/unreliable in practice —
see ml-service/scripts/01_collect_dataset.py docstring), cleaned, balance-checked, and split.
1200 raw → 1181 cleaned (98.4% retention) → 824 train / 178 val / 179 test, all 6 categories
within 192–200 images (see ml-service/data/dataset_summary.txt). Unsplash API key lives in
ml-service/.env (gitignored) as UNSPLASH_ACCESS_KEY.
Backend (Node/Express) and frontend (React/Vite) scaffolding, routes, pages, and DB
(PostgreSQL "weddinglens" DB, schema + 42 seed vendor rows) are also already built — see
backend/ and frontend/. Postgres credentials are in backend/.env (gitignored).
Post-proposal-extension #7 complete — real local vendor images pipeline finished for all 11
categories the project owner supplied images for (ml-service/notebooks/<Category>/ -> copied
into backend/vendor-images/<slug>/ -> served via server.js's /vendor-images static route ->
resolved on the frontend with resolveMediaUrl() -> assigned distinct-per-vendor via a
ROW_NUMBER()-based SQL cycling UPDATE -> category hero images updated in
frontend/src/data/vendorCategoryInfo.js). Verified end-to-end: DB shows 15 distinct image_url
per category, API returns correct relative paths, static route returns 200, frontend build
compiles clean. `venue` remains on its original licensed Unsplash photo (no local venue photos
were supplied). Bridal wear hero uses a real Kandyan bridal photo.

Phase 2 complete — model trained and evaluated. Test accuracy: 55.31% (val accuracy 48.88% at
best epoch 19/20, CPU-only training, no early stopping triggered). Per-class F1 ranges 0.47–0.66;
main confusions are boho_chic↔traditional_classic and luxury_glamour↔minimalist_modern (visually
similar styles). Found and fixed a real bug in gradcam_utils.py: find_base_model() was grabbing
the data_augmentation Sequential (also a tf.keras.Model subclass) instead of the EfficientNetB3
sub-model, since it just took the first nested Model — fixed to search for the sub-model that
actually contains the "top_conv" layer. All Phase 2 outputs are in ml-service/models/ (trained
.keras model, training_curves.png, confusion_matrix.png, evaluation_report.txt, model_summary.txt,
gradcam_examples/). Phase 5 complete — full system integrated and tested end-to-end against the real
trained model. Confirmed live: POST /api/predict correctly classified a real
garden_floral test photo, returned a working Grad-CAM heatmap URL, and logged the
prediction to PostgreSQL; GET /api/vendors returns real seed data; frontend (Vite)
serves all 3 pages without transform errors. All edge cases in docs/testing_checklist.md
passed (bad file type, oversized file, invalid/missing style, unknown route). Added
express-rate-limit to POST /api/predict (10 req/min/IP) per docs/security_notes.md's
review, since each prediction spawns a full Python/TensorFlow subprocess and was an
unthrottled resource-exhaustion risk. Root README.md written.
Phase 6 complete — dissertation chapters drafted in docs/01_introduction.md through
docs/05_conclusion_and_future_work.md, using only real figures from
ml-service/data/dataset_summary.txt, ml-service/models/evaluation_report.txt, and
model_summary.txt (55.31% test accuracy, per-class F1 0.47–0.66, etc. — no invented
numbers). Literature review (02) cites established papers (EfficientNet, Grad-CAM,
DeepFashion, LIME, CAM, ImageNet) but explicitly flags that no peer-reviewed
wedding-style-classification-specific work could be found, rather than fabricating
one. Chapter 2's 9 citations were independently verified against dblp/CVF Open
Access/ICML proceedings/Semantic Scholar on 2026-08-25 - all matched exactly, no
corrections needed (see docs/02_literature_review.md's "Independent verification"
note). Sections still needing the student's personal input (genuinely require the
student, not just more research - these were left untouched): ethics
approval/consent details for the Unsplash-sourced images (if required by the
institution), a personal reflection section, and viva-specific content.

ALL 6 PHASES OF THE MASTER GUIDE ARE NOW COMPLETE. The system is fully built,
trained, integration-tested, and documented end-to-end.

## Post-master-guide extension (per the formal proposal document)
After the master guide's 6 phases were complete, the formal project proposal
(`.claude/CL_BSCSD_32_57_CIS_6002.docx`) was reviewed and its additional required
features were built and tested end-to-end against the real backend/database:
- **Multi-image upload**: POST /api/predict now accepts 1-5 images (field name
  "images", changed from the original single-image "image" field) in ONE request,
  loading the model once for the whole batch (see ml-service/scripts/09_predict.py,
  now batch-capable, and backend/controllers/predictController.js). Single-image
  responses kept their original flat JSON shape for backward compatibility;
  2+ images return `{ results: [...] }`. Frontend: UploadPage supports multi-select,
  routes to ResultsPage (1 image) or the new MultiResultsPage (2+ images).
- **Style dashboard**: frontend/src/data/styleInfo.js — static colour palette +
  keywords + decor suggestion per style, shown via the shared PredictionCard
  component (frontend/src/components/PredictionCard.jsx) used by ResultsPage,
  MultiResultsPage, and ComparePage.
- **Style comparison**: new /compare page + ComparePage.jsx — dedicated 2-image
  upload UI, calls the same POST /api/predict, shows both PredictionCards side by
  side plus a plain-language comparison summary.
- **User accounts + inspiration board**: users table + predictions.user_id column
  added via backend/db/schema.sql (idempotent ALTER TABLE migration, safe to re-run).
  JWT auth (bcryptjs + jsonwebtoken) via backend/middleware/auth.js
  (optionalAuth/requireAuth), backend/controllers/authController.js,
  backend/routes/auth.js (POST /register, /login, GET /me), backend/routes/profile.js
  (GET /api/profile/analyses). Frontend: AuthContext.jsx (localStorage-backed),
  LoginPage/SignupPage/ProfilePage. Login is optional everywhere else in the app.
  JWT_SECRET lives in backend/.env (gitignored), generated once via
  `python -c "import secrets; print(secrets.token_hex(32))"`.
- Added rate limiting to /api/auth/* (20 attempts/15min/IP) as brute-force
  protection, matching the existing /api/predict rate limit.
- All of the above was verified live (not just code review): register/login/me,
  duplicate-email and wrong-password rejection, single-image predict linking to
  a user's board, a real 2-image comparison (~15s for both vs ~35s each
  separately — confirms the single-model-load-per-batch design works), and a
  3-image upload with all 3 correctly appearing on that user's board. See
  docs/testing_checklist.md's "Additional feature tests" section for the full
  results table. docs/security_notes.md's "Authentication" section documents
  the auth-specific security posture (bcrypt hashing, generic login error
  messages, JWT with no revocation, rate limiting).
- Test artifacts (the test@example.com account and its predictions) created
  while verifying this were deleted from the live database afterward — it
  should be clean for real use.

## Post-proposal-extension #2: Sri Lankan vendor data + GUI redesign
Per the user's follow-up request, the vendor dataset was replaced entirely with 180
REAL Sri Lankan wedding vendors (15 per category × 12 categories: florist, decorator,
cake_artist, bridal_wear, groom_wear, makeup_artist, rental, photography_videography,
venue, jewellery, caterer, wedding_planner), researched via web search (rainbowpages.lk
directory + real Instagram/Facebook-known vendors the user specifically named: Jethro
Photography, Ceylon Wedlock, Beyond Destiny, One Weddings, Magical Moments, Dhananjaya
Bandara, Jeni MUA, etc.). Generated via
C:\Users\SASANDINIE\AppData\Local\Temp\claude\...\scratchpad\generate_seed.py (a
throwaway generator script, not part of the repo) into backend/db/seed.sql, which now
starts with `TRUNCATE TABLE vendors RESTART IDENTITY;`. Honesty rules applied: no
fabricated ratings (NULL unless a real one was found, e.g. Beyond Destiny's 5.0),
no invented phone/emails (real contact info used only where found, else points to
the source directory), wedding_style is this project's OWN editorial tagging (not a
vendor's self-description), image_url is a neutral placehold.co placeholder (no
scraped real photos). See seed.sql's own header comment for full sourcing notes.
caterer/wedding_planner were kept (per user's choice) alongside the 9 categories they
explicitly listed; bridal_wear and groom_wear were kept as SEPARATE categories (per
user's choice, not one combined "bridal dressers" category).

GUI redesign: Google Fonts added (Playfair Display for headings, Inter for body) via
frontend/index.html. New design tokens in index.css (--font-display, --font-body,
--gradient-hero, --shadow-lg, .card-hoverable, .gradient-panel utility classes).
Login/Signup rebuilt as a full-screen immersive split-panel (frontend/src/components/
AuthLayout.jsx + AuthLayout.css) with the Navbar hidden specifically on /login and
/signup (see App.jsx's Layout component + NAVBAR_HIDDEN_ROUTES). ProfilePage became a
real "Dashboard": a gradient hero banner with quick actions, 4 stat cards (total
analyses, most common style, average confidence, last analysis date - all computed
client-side via useMemo from the existing /api/profile/analyses response, no new
backend endpoint needed), then the inspiration board grid below. Navbar's profile link
relabelled "Dashboard". VendorsPage.jsx's CATEGORY_LABELS updated for the new 12-category
taxonomy (was still the old 7-category set - would have silently fallen back to raw
category strings as section headings) and its section ordering fixed to follow a
curated display order (venues first, rentals/planners last) instead of the API's
alphabetical order.

All of the above verified live: fresh build (`npm run build`) compiles clean, all new
modules transform without error, GET /api/vendors?style=... returns real vendor names
correctly grouped, and a full register -> predict -> GET /api/profile/analyses round
trip returns data in the exact shape ProfilePage's stat calculations expect. Test
data from this verification was deleted afterward (DB + backend/uploads).

## Post-proposal-extension #3: landing page + vendor category browsing
Per the user's follow-up, added:
- **LandingPage** (frontend/src/pages/LandingPage.jsx) at "/" - full-screen hero with a
  real Unsplash photo (properly licensed, credited on-page to photographer "Vows on the
  Move" per Unsplash's attribution guidelines - same sourcing method as the ML dataset),
  heartfelt tagline, and CTAs to /signup, /login, or /upload (guest). Navbar hidden on
  "/" (and still on /login, /signup) for an immersive feel - see App.jsx's Layout
  component / NAVBAR_HIDDEN_ROUTES.
- **UploadPage moved from "/" to "/upload"** - every internal link/navigate("/") that
  meant "go upload a photo" was updated to "/upload" (ResultsPage, MultiResultsPage,
  ProfilePage's dashboard). Navbar links updated accordingly + added.
- **General vendor browsing** (the user's "another tab to display all registered
  vendors, nice boxes categorizing each vendor"): new /vendors route
  (VendorCategoriesPage.jsx) shows all 12 categories as icon-card tiles (see
  frontend/src/data/vendorCategoryInfo.js for the icon/gradient/blurb per category),
  each linking to /vendors/category/:category (VendorCategoryPage.jsx) listing every
  vendor in that category via the new shared VendorCard.jsx component. This is
  SEPARATE from the existing style-matched vendor flow, which was refactored from
  VendorsPage.jsx (deleted) into VendorsByStylePage.jsx at /vendors/style/:style,
  reading the style from the URL param instead of router state (bookmarkable, and all
  "See matching vendors" links across PredictionCard.jsx/ProfilePage.jsx updated to
  this new path).
- **Backend**: vendors table gained instagram_url/facebook_url/tiktok_url/website_url
  columns (migrated in schema.sql, same IF NOT EXISTS pattern as before).
  vendorController.js/routes/vendors.js extended: GET /api/vendors/categories (counts
  per category, in a fixed display order) and GET /api/vendors?category=X (all vendors
  in a category, any style) alongside the original ?style=X. seed.sql regenerated with
  real social/website links for 37 of 180 vendors (found via the same web research as
  before - see SOCIAL_LINKS in the generator script) - the rest genuinely don't have a
  findable public account, left NULL rather than guessed.
- **Vendor "photos"**: per explicit user decision (asked directly, since scraping real
  Instagram/Facebook photos isn't reliable or safe to embed without the vendor's
  involvement), vendor cards show a styled category icon treatment instead of a real
  photo. Real Instagram/Facebook/TikTok/website links ARE shown as clickable buttons
  where found, so users can see real photos on the vendor's own page.

All verified live: production build compiles clean, all new routes/modules load, and
GET /api/vendors/categories + GET /api/vendors?category=... return correct data
including social links.

## Post-proposal-extension #4: vendor card polish (contact fallback + category photos)
Two user-requested fixes on top of extension #3:
- Removed the "See rainbowpages.lk business directory..." filler text that was showing
  under Contact for the ~143 vendors with no real phone/email found. contact_info is now
  genuinely NULL for those (generator script's CONTACT_KNOWN.get(name) with no fallback
  string), and VendorCard.jsx already only renders the Contact line when truthy, so it
  now just doesn't show at all - more honest than pointing at a generic search.
- User asked for Instagram-sourced Sri Lankan wedding photos on category cards (both the
  /vendors grid and each vendor card within a category). Checked directly against the
  Unsplash API first: every "Sri Lankan wedding <category>" query returned ZERO results,
  confirming there's no meaningful Sri-Lanka-specific wedding stock available there.
  True Instagram scraping was ruled out again (session-signed URLs that expire in
  hours, and real privacy/rights concerns hotlinking real couples'/vendors' personal
  photos without consent). Used real, properly-licensed generic wedding photos from
  Unsplash instead - one per category (12 total), each vendor card and category tile
  now shows that category's real photo as its background with the emoji icon as a small
  corner badge (see frontend/src/data/vendorCategoryInfo.js's `image`/`photographer`/
  `photographerUrl` fields, VendorCard.jsx, VendorCategoriesPage.jsx). Attribution
  handled via a "Photo credits" line at the bottom of both /vendors and
  /vendors/category/:category, crediting each photographer with a link, per Unsplash's
  attribution guidelines - not repeated per-card (would be noisy at 180 vendors) but
  present and real.

## Post-proposal-extension #5: distinct per-vendor images, real contact backfill, UI bugs
Large follow-up batch:
- **Contact info backfill**: re-fetched the SAME rainbowpages.lk directory pages used to
  build the vendor list, this time asking for phone numbers too (originally only asked
  for name+address). Went from 143 vendors with zero contact/social info down to 43, by
  merging ~90 real phone numbers into generate_seed.py's CONTACT_KNOWN dict. This is a
  one-off Python script living in the session scratchpad
  (.../scratchpad/generate_seed.py), NOT part of the repo - re-run it + copy
  unsplash_category_pools.json alongside it if seed.sql ever needs regenerating again.
- **Distinct per-vendor images**: previously every vendor in a category shared the exact
  same category-level image (user's screenshot showed 4 different hotels all displaying
  the same candelabra photo). Fixed by fetching a POOL of ~10-15 real Unsplash photos per
  category (search queries broadened per-category; `orientation: 'squarish'` was silently
  killing "venue" results down to 1 - removed for that query) and assigning each vendor a
  distinct photo by list position (cycling if a pool is short). vendors table gained
  image_photographer/image_photographer_url columns (migrated) for proper per-photo
  Unsplash attribution; VendorCard.jsx now renders vendor.image_url (not the shared
  category image); VendorCategoryPage.jsx and VendorsByStylePage.jsx both show a
  de-duplicated "Photo credits" line listing every distinct photographer actually
  displayed on that page.
- **4 category hero images replaced** (groom_wear, bridal_wear, wedding_planner, caterer)
  after user feedback that they were poorly composed/hard to identify - manually reviewed
  multiple candidates per category and picked clear, well-lit, centered ones in
  frontend/src/data/vendorCategoryInfo.js.
- **contact_info fallback text removed**: was showing "See rainbowpages.lk business
  directory..." for vendors with no real contact found - now genuinely NULL, so
  VendorCard.jsx just doesn't render that line (more honest than pointing at a directory).
- **Two real UI bugs fixed**: LandingPage's "Start now" button and ProfilePage dashboard's
  "+ Analyse a new photo" button were rendering with INVISIBLE white-on-white text - both
  had a custom CSS class trying to override the global `.btn` rule's `color: #fff`, but
  with equal selector specificity (both single-class selectors) the winner depended on
  CSS bundle order, not intent. Fixed both by qualifying the selector with a parent class
  (e.g. `.landing-footer-cta .landing-footer-btn`) to reliably win the cascade - worth
  checking for this same pattern (custom class + `.btn`, both setting `color`) if any
  future button looks blank.
- Removed the landing hero's on-page Unsplash photo credit (user asked; the Unsplash
  License doesn't require on-page attribution, unlike the individually-credited vendor
  category photos which use a different, bulk-search sourcing pattern per Unsplash's
  guidelines for that use case) and the small color-swatch balls + "15 vendors" count
  pill on the auth panel / category cards (user asked; auth panel gained a real Unsplash
  photo background behind its gradient wash instead).

## Post-proposal-extension #6: targeted hero swaps + attribution removed
- Replaced 3 category hero images per user request: jewellery (now a real jewellery-shop
  display case, not a bridal portrait), wedding_planner (a planner's actual event table/
  signage), photography_videography (a videographer with a camera rig on location) - all
  in frontend/src/data/vendorCategoryInfo.js.
- Explicitly did NOT relabel generic North Indian bridal photos as "Kandyan" for
  jewellery/makeup_artist - checked directly, Unsplash has zero authentic Sri
  Lankan/Kandyan content (every such query returns 0 results), and Kandyan bridal
  dress/jewellery is visually distinct from Rajasthani/Punjabi bridal imagery (different
  jewellery style, different draping) - using mislabeled stock photos would misrepresent
  a specific culture, so makeup_artist's hero was left as the existing generic (accurate,
  non-cultural-claim) bridal makeup application photo.
- Decorator hero left unchanged - searched multiple "glamorous/opulent" angles, found
  nothing clearly better than what's already there (mostly got soft pastel centerpieces
  or off-topic religious-ceremony decor back).
- Removed all "Photo credits via Unsplash, by ..." attribution lines site-wide (from
  VendorCategoriesPage, VendorCategoryPage, VendorsByStylePage) and the landing hero's
  on-page credit, per user request - the Unsplash License doesn't legally require
  on-page attribution (just "appreciated"), so this is a legitimate style choice.
- Signup page: "Name (optional)" label simplified to "Name".

## Post-proposal-extension #7: real local vendor images pipeline
User supplied REAL reference images directly as local files in
ml-service/notebooks/<Category>/ (one folder per vendor category, ~15-17 images each) -
resolving the earlier Instagram/Pinterest-scraping limitation by having the project
owner source/save the images themselves rather than Claude scraping them. Pipeline
built and run for all 11 categories the project owner supplied images for (bridal_wear
first, then Cake artists, caterers, Decorations, Florists, Groom wear, Jewellery,
Makeup artists, photography & videography, rentals, wedding planners):
1. Copy category's local images into backend/vendor-images/<category>/ with clean
   sequential names (bridal_wear_01.jpg etc.) - NOT gitignored (unlike backend/uploads/
   which holds ephemeral user-uploaded prediction photos), these are real project assets.
2. server.js serves them statically at /vendor-images/<category>/<file>.
3. New frontend/src/utils/mediaUrl.js's resolveMediaUrl() - resolves a URL that's
   either an absolute external URL (Unsplash, other categories) or a relative
   /vendor-images/... path (needs prefixing with the backend's API_BASE_URL) - used by
   VendorCard.jsx and VendorCategoriesPage.jsx wherever an image is rendered.
4. DB: direct SQL UPDATE assigns each vendor in a category a distinct local image by
   cycling through the copied files (id - <first_id_in_category>) % <pool_size>, so
   no two vendors in the same category share an image (same "distinct per vendor" goal
   as the Unsplash pools, just with real supplied photos now for these 11 categories).
5. vendorCategoryInfo.js's `image` field updated to the category's local hero path for
   done categories; `photographer`/`photographerUrl` set to null (no Unsplash
   attribution applicable to these).
Re-verified live end-to-end for ALL 11 categories on 2026-08-25 (not just bridal_wear):
`backend/vendor-images/` has all 11 folders populated (16-18 files each), a DB query
confirms every non-venue category has 15/15 vendors on distinct local /vendor-images/...
paths (zero leftover Unsplash URLs), the static route spot-checked 200 across multiple
categories, and vendorCategoryInfo.js's hero images are set for all 11. `venue` is
correctly still 100% Unsplash (no local venue photos were ever supplied). The rollout
is complete - there is nothing left to repeat here.

## Post-proposal-extension #8: real per-photo colour palettes + a retraining experiment
Two fixes requested after the user pointed out the Style Dashboard's colour palette was a
static per-style stand-in (not derived from the actual uploaded photo) and asked whether the
confidence-score spread across all 6 categories could be forced to 0% for visually implausible
ones:
- **Real colour palette**: ml-service/scripts/09_predict.py gained `extract_dominant_colors()` -
  k-means clustering (sklearn) over the actual uploaded photo's pixels, returning the 5 most
  common colours as hex, ordered by coverage. Passed through as `dominant_colors` in the
  /api/predict response (backend/routes/predict.js) and preferred by PredictionCard.jsx over
  the old static frontend/src/data/styleInfo.js palette (which is now only a fallback if
  extraction ever fails). Verified live end-to-end.
  **Follow-up fix (same session)**: user reported the extracted palette still looked wrong -
  bright, colourful tablescape photos (turquoise plates, pink flowers, white linens) were
  coming back as gray/tan/brown. Investigated directly against real test-set photos and
  confirmed a real, reproducible bug: naive population-count k-means systematically favours
  large, visually unremarkable regions (blurry out-of-focus foreground foliage, dim
  backgrounds, deep shadow) over small-but-meaningful decor colours, purely because those
  regions cover more raw pixels - e.g. a photo of flowers framed by blurry dark tree
  branches came back almost entirely near-black, with the actual pink flowers barely making
  the list. Fixed with two changes to extract_dominant_colors(): (1) each pixel is weighted
  by HSV saturation before clustering, with near-black pixels specifically suppressed
  (without penalising genuine low-saturation-but-bright whites/pastels, which are legitimate
  decor colours); (2) clusters into more groups than are shown (8 internally for a 5-colour
  output) and greedily picks the most-weighted clusters that are each perceptually distinct
  from ones already picked, so near-duplicate muddy greys don't crowd out a small but
  visually distinct accent colour. Verified the fix directly against several real test
  photos (before/after comparison) - a foliage-framed floral photo went from
  90%+ near-black output to correctly surfacing its actual pink flower colour and greens; a
  photo with real white content went from missing white entirely to correctly including it.
  A genuinely dark/night photo still correctly comes back mostly dark - this only stops
  incidental background/shadow pixels from outvoting a photo's real visual character, it
  doesn't hide real darkness.
- **Confidence-score request declined as asked, retraining attempted instead**: forcing
  implausible categories to literal 0% would mean fabricating numbers the model never
  produced - directly against this project's "no invented numbers" principle used everywhere
  else (dissertation, seed data). Explained this to the user; they chose to genuinely retrain
  the model instead. Backed up the v1 model to ml-service/models_v1_backup/ first. Tried a v2
  training config in ml-service/scripts/06_train_model.py: raised epoch budget (15+35 vs
  10+10, since v1 never triggered EarlyStopping - it was cut off by the hard cap, not
  converged), added ReduceLROnPlateau, widened EarlyStopping patience to 6, and added
  translation/brightness augmentation on top of v1's flip/rotation/zoom/contrast.
  **Result: v2 scored WORSE on the real test set (53.63% vs v1's 55.31%)** - notably much
  worse at luxury_glamour (f1 0.47->0.34) despite improving a few other classes
  (traditional_classic, boho_chic). Reported this honestly rather than keeping the worse
  model; rolled the LIVE model back to v1 (restored from models_v1_backup/ - confirmed
  loading and predicting correctly afterward). v2's full artifacts (model file, evaluation
  report, confusion matrix, training log) kept in ml-service/models_v2_experiment/ for
  reference, not deleted. Separately found and fixed a real bug while investigating v2's
  result: 06_train_model.py's ModelCheckpoint callback was being re-instantiated fresh per
  training phase, which resets its internal "best value seen so far" tracker - Phase B could
  therefore silently overwrite a better Phase A checkpoint on disk with a worse epoch, just
  because it looked like an improvement relative to Phase B's own uninformed starting point.
  Fixed by sharing ONE ModelCheckpoint instance across both phases (EarlyStopping/
  ReduceLROnPlateau still correctly get fresh instances per phase, since their state SHOULD
  reset when the optimizer/LR/unfrozen-layers genuinely change). This didn't end up mattering
  for v2's actual outcome (checked directly - the disk file matched Phase B's own best
  epoch, which happened to also be the epoch actually used) but was a real correctness gap
  worth fixing for any future retraining attempt.
**The live model is still v1, 55.31% test accuracy, unchanged from Phase 2.** A future
retraining attempt should probably try smaller/targeted changes (e.g. only the epoch-budget
fix, without the added augmentation) rather than changing several things at once, to make it
possible to tell which change actually helped or hurt.

## Post-proposal-extension #9: real logo + landing page redesign
User asked for a real logo (site had none - just a plain "WeddingLens" text wordmark
everywhere, and the default Vite/Claude Code placeholder favicon). First attempt was a
gradient camera-lens-ring + heart icon; user then shared a reference (an Etsy "wedding
monogram logo" style sheet - elegant serif initials, thin botanical linework, often ringed
by a wreath rather than a square box) and asked for that style instead, plus "not a square
frame". Final design: frontend/src/components/Logo.jsx - a "W | L" monogram set in the
site's own Playfair Display display font (not a new typeface), with a small botanical sprig
below the divider, ringed by a delicate laurel-style wreath (22 small leaves placed by trig
around a circle, tangentially rotated - computed, not hand-drawn, so it renders correctly
without needing visual iteration). Single-ink colour per `variant` prop: "brand" (rose-brown,
for light surfaces) or "light" (cream, for the dark photo-scrim backgrounds on the landing
hero/auth pages) - no gradients, matching the reference's monochrome-linework look.
frontend/public/favicon.svg rebuilt to match (a bolder, simplified 16-leaf version, no fine
sprig - too thin to read at a 16-32px tab icon). Wired into Navbar.jsx, AuthLayout.jsx (both
the photo-panel mark and the mobile-only form-panel link), and LandingPage.jsx.
Verified visually, not just "compiles clean": installed svglib+reportlab in ml-service/venv
to rasterize the SVGs directly (pycairo/rlPyCairo wouldn't fully install on this Windows
machine, but svglib's own PM backend worked once given a real Windows path, not /tmp) to
confirm the wreath+monogram geometry actually renders correctly before calling it done, then
installed Playwright (`npx playwright install chromium`) and screenshotted the live dev
build itself (desktop, mobile, and the navbar on another page) for final confirmation - both
methods came back clean.
Same session: user asked to also upgrade the landing page layout to be more "eye-catching"
with a bigger logo. Reworked frontend/src/pages/LandingPage.jsx/css: hero logo lockup grown
from a small 38px uppercase text-only line to a real 56px icon + 1.9rem serif wordmark brand
moment, added a small pill "AI-Powered Wedding Style Finder" kicker badge, a fade-rise-in
entrance animation on the hero content (CSS only), an animated scroll-cue at the hero's
bottom edge, hover-lift transitions on every CTA button, upgraded the "How it works" steps
from bare text to proper shadowed cards with gradient-filled step-number circles, and added
a subtle radial glow + the logo mark to the footer CTA band. All confirmed via the same
Playwright screenshot method (full desktop + mobile + section-by-section).

## Post-proposal-extension #10: landing page tweaks + full code-comment sweep + doc audit
Three pieces of follow-up work in one session (2026-08-25):
- **Landing page**: removed the "AI-Powered Wedding Style Finder" kicker pill from the
  hero (frontend/src/pages/LandingPage.jsx). The primary hero CTA when logged in
  ("Upload a photo") now links to `/login` instead of straight to `/upload` - per
  explicit user decision (asked directly: this one hero button only, vs. removing the
  guest bypass site-wide) the "Or try it now without an account" guest link and the
  footer "Start now" button were deliberately left as direct `/upload` links, so
  anonymous/guest use is still possible elsewhere on the page, just not via that one
  specific button. Verified via `npm run build`.
- **Full code-comment sweep**: went through all 39 source files (11 backend, 19
  frontend, 11 ml-service scripts + gradcam_utils.py in ml-service/scripts/) and added
  a function-level comment/docstring to every main and helper function that was
  missing one - most files already had solid module-level header comments from prior
  sessions, so the gap was mainly small unexported helpers and inline handlers (e.g.
  `isValidEmail`, `signToken`, `getTokenFromHeader`, `fileFilter`, route handlers'
  one-line purpose comments, `addFiles`/`handleSubmit`/`handleCompare` in the upload
  and compare pages, AuthContext's `persist`/`login`/`register`/`logout`, and Python
  docstrings on `main()`/helper functions across all 10 numbered ml-service scripts +
  gradcam_utils.py). No logic was changed - verified with `npm run build` (frontend),
  loading every backend module directly via `node -e`, and `python -m py_compile` on
  every ml-service script, all clean.
- **Doc-accuracy audit prompted by a user-shared review screenshot**: the review
  flagged (1) a possibly-incomplete vendor image rollout and (2) the Phase 6 "needs
  the student" list. Investigated (1) directly against the filesystem/DB/live server
  rather than trusting old notes - the rollout was actually complete; the real bug was
  stale, self-contradicting text left in this file's extension #7 section from
  partway through that session (now fixed - see that section above). For (2),
  independently verified all 9 Chapter 2 citations in docs/02_literature_review.md
  against dblp/CVF Open Access/ICML proceedings/Semantic Scholar (all matched exactly,
  see that file's "Independent verification" note and the Phase 6 note above) - ethics
  approval/consent, personal reflection, and viva-prep were correctly left alone since
  those genuinely need the student, not more research.
- **README audit**: root README.md, backend/README.md, and frontend/README.md were
  checked against the actual current system and updated for drift accumulated across
  extensions #2-#9 - see each file's own content for specifics (frontend/README.md in
  particular was still the unedited Vite template and has been replaced with real
  project documentation).

## Post-proposal-extension #11: proposal-vs-built audit (Flask + Docker gaps)
User shared a review comparing the formal proposal against what was actually built,
flagging two real gaps: the backend was proposed as Flask but built with Node.js/
Express, and Docker (listed as a proposal resource) was never used. Extracted and
read the actual proposal text directly from `.claude/CL_BSCSD_32_57_CIS_6002.docx`
(binary .docx - unzipped it and parsed `word/document.xml` to get real text rather
than guessing) to confirm both gaps against the source document, not just the review.

**Flask decision**: asked the user directly rather than unilaterally rewriting a
backend with 10 extensions and every integration test already built and verified
against it. User chose to document the deviation rather than rewrite - see
docs/03_methodology.md §3.5.1 for the full honest justification (functionally
interchangeable for what this backend does; the real trade-off is two languages
across the stack instead of Python end-to-end) and the "Note on deviation" under
Tech stack above.

**Docker**: actually implemented, not just documented - `docker-compose.yml` at the
repo root (db/backend/frontend services), `backend/Dockerfile` (Node.js + a Python
venv inside the same container, mirroring the non-Docker subprocess-invocation
design - only ml-service's scripts/models are copied in, not the training
data/notebooks), `frontend/Dockerfile` (multi-stage: Vite build -> nginx, with
`frontend/nginx.conf` for SPA route fallback so direct loads of routes like
`/vendors/category/florist` don't 404), root `.dockerignore` + `frontend/.dockerignore`,
and a root `.env.example` for compose's `DB_PASSWORD`/`JWT_SECRET`. Postgres's schema
+ real 180-vendor seed data auto-load via `docker-entrypoint-initdb.d/`, no manual
`psql` step needed.
**Update (same day, later in the session): Docker Desktop installed and the setup
build-verified live.** User installed WSL2 + Docker Desktop (Windows 11 Home ->
WSL2 backend, per-user install) on their own machine, guided step-by-step
(`wsl --install`, then the Docker Desktop installer, then `docker run hello-world`
to confirm). Once Docker was confirmed working, ran `docker compose up --build` for
real: all 3 containers built and started cleanly (`db` healthy, `backend`/`frontend`
up). Hit one real, expected snag - the dev machine's native Windows PostgreSQL
service already holds port 5432, so `db`'s host port needed remapping. Fixed via a
local-only `docker-compose.override.yml` (standard Compose pattern, auto-merged, does
NOT affect the backend<->db connection since that's internal Docker networking) -
gitignored via a new root `.gitignore` (also added `.env` there, since the root
`.env` created for compose's `DB_PASSWORD`/`JWT_SECRET` is a real secret and the
project had no root .gitignore yet, unlike backend/ml-service's own .env files).
Then verified the ACTUAL request path end-to-end against the running containers, not
just container status: `GET /api/health`, `GET /api/vendors/categories` (confirmed
all 12 categories x 15 vendors seeded correctly), a real test image POSTed to the
containerized `POST /api/predict` (confirmed the Python/TensorFlow/OpenCV subprocess
pipeline works inside the container - real prediction, dominant-colour palette, and
a working Grad-CAM heatmap URL all returned), the prediction correctly logged to the
containerized Postgres, and the frontend's nginx SPA fallback (a deep route,
`/vendors/category/florist`, returned 200 not nginx's default 404). Test data from
this verification was deleted from the containerized DB + uploads volume afterward.
**The Docker setup is now genuinely verified, not just written-and-hoped** - see
docs/03_methodology.md §3.5.2's updated verification note and README.md's Docker
section for the full details.
Also fixed a stale reference caught while editing docs/03_methodology.md §3.5: it
still described a `VendorsPage` component that was refactored away in
extension #3 (into VendorCategoriesPage/VendorCategoryPage/VendorsByStylePage) -
updated to describe the actual current page set.

## Post-proposal-extension #12: repo cleanup + "in plain terms" comment pass
User asked for a full system refresh: remove unnecessary files, update all docs, and
make comments easier to understand. Three pieces:
- **Cleanup**: removed a genuinely orphaned 55MB `venv/` folder sitting at the repo
  ROOT (not `ml-service/venv/` - an old, unused, unreferenced duplicate, confirmed via
  repo-wide grep that nothing pointed to it before deleting), `ml-service/scripts/
  __pycache__`, a stale `frontend/dist/` build artifact, and ~20 leftover test-upload
  images + their Grad-CAM overlays in `backend/uploads/` accumulated across earlier
  testing sessions (Aug 22 + Aug 25) that were never cleaned up on disk. Also deleted
  the 20 matching test rows from the local `predictions` table - asked the user to
  confirm first, since an unscoped `DELETE FROM predictions` is a real destructive
  action (the auto-approval classifier correctly blocked it unprompted; user confirmed
  explicitly before it ran).
- **Doc audit**: found and fixed 3 files still carrying a stale "NOT build-verified"
  note from before the Docker verification (`backend/Dockerfile`, `frontend/Dockerfile`,
  `docker-compose.yml`) - CLAUDE.md/README.md/docs/03_methodology.md had already been
  updated to say "verified" but these three inline file comments were missed. Also
  added a "prefer Docker?" pointer to backend/README.md and frontend/README.md (neither
  mentioned the Docker option at all), and fixed one markdown formatting nit in
  README.md (a missing blank line before "See docs/05_conclusion...").
- **"In plain terms" comment pass**: per explicit user choice (asked directly, given
  the size of the alternative) - kept every existing detailed/technical comment
  exactly as-is (real value for the dissertation's methodology writeup), but added one
  short, jargon-free summary sentence at the very top of each file's header comment,
  explaining what that file does in everyday language before the technical detail
  starts. Covered all 39 source files (11 backend, 19 frontend, 11 ml-service +
  gradcam_utils.py) plus the 3 Docker files. Verified nothing broke: `npm run build`
  clean, every Python script still `py_compile`-clean, and every backend module
  (including server.js itself, confirmed via a live health-check request) still loads
  and runs correctly.
Noted for the record: Docker Desktop was not running at the end of this session (the
daemon appears to have stopped, possibly related to the laptop restart earlier in the
session) - not a project bug, just relaunch it before running `docker compose` again.

## Post-proposal-extension #13: seed.sql was stale + a real Docker port bug
User reported vendor CARDS (not category cards, which were already correct) weren't
showing their real supplied photos. Investigated directly rather than guessing, and
found two separate, real bugs:

1. **seed.sql never reflected extension #7's real-photo assignment.** That work only
   ever ran as a one-off `UPDATE` against the LOCAL database - it was never saved back
   into `backend/db/seed.sql`, which still had the old per-vendor Unsplash pool URLs
   from extension #5 baked in. This meant any FRESH deployment seeded from that file
   (i.e. the Docker setup, which auto-loads it via `docker-entrypoint-initdb.d/`) got
   the old Unsplash photos, not the real ones - even though the LOCAL dev database
   (queried directly, outside Docker) had always been correct. Fixed by regenerating
   `seed.sql` as an exact snapshot of the local database's current (correct) vendors
   table (via a throwaway generator script, `.../scratchpad/regenerate_seed.js`, not
   part of the repo) - all 180 rows, 165 now with real `/vendor-images/...` paths
   (image_photographer left NULL for these), 15 (`venue`) still on real Unsplash
   photos with proper attribution. Also rewrote the file's stale header comment, which
   still described `image_url` as a `placehold.co` placeholder from extension #2 -
   long since untrue. Applied directly to the running Docker `db` container too (not
   just the file, so the fix took effect immediately without needing a volume wipe) -
   re-verified via a live query: every non-venue category shows 15/15 vendors on
   distinct local paths, `venue` still 100% Unsplash, matching the local DB exactly.
2. **A real Docker Compose bug in this project's own override file.**
   `docker-compose.override.yml` (added when Docker was first verified, see extension
   #11) was meant to REMAP the `db` service's host port from 5432 to 5433 to avoid
   colliding with this machine's native PostgreSQL service. It didn't - Compose merges
   `ports` lists ADDITIVELY across files, not by replacing, so the container ended up
   publishing BOTH 5432 AND 5433. After a laptop restart, Docker's Postgres won the
   race for port 5432 before the native Windows service did, silently redirecting any
   local tool that assumed "port 5432 = native Postgres" (like the seed-regeneration
   script, initially) to the wrong database with the wrong password. Fixed by removing
   the `ports` mapping from `db` in the base `docker-compose.yml` entirely (internal
   Docker networking on 5432 is all the backend<->db connection ever needed - a host
   port was only ever for convenience) and keeping 5433 solely in the override, with a
   comment on both files warning about this exact additive-merge trap for the future.
   Also had to start the native `postgresql-x64-16` service, which had also stopped
   (likely from the same earlier restart) - required the user to run
   `Start-Service postgresql-x64-16` as admin, since this session can't elevate.
Both fixes verified live, not just written: Docker's vendor API now returns the same
correct data as the local DB, the static `/vendor-images/` route serves real files,
and port 5432 is confirmed free for native Postgres while 5433 correctly reaches
Docker's Postgres with no collision.

## Post-proposal-extension #14: Sri Lankan-market style taxonomy retrain + full system cutover
User asked to replace the original 6-class generic-aesthetic style taxonomy (boho_chic,
rustic_barn, luxury_glamour, garden_floral, minimalist_modern, traditional_classic) with
one reflecting the actual Sri Lankan wedding market. This was the single largest change to
the project since the original 6 phases - touched the dataset, the trained model, the
backend, the frontend, the vendor database, and the dissertation chapters. Full details are
in each area's own file (this section is a summary/index); see especially
`ml-service/data/raw/README.md` and `ml-service/data/raw/sinhala_kandyan/PROVENANCE.md` for
the dataset story, and `docs/03_methodology.md` §3.1/`docs/04_results_and_evaluation.md` for
the methodology/results write-up.

**Final taxonomy (5 classes)**: `sinhala_kandyan`, `tamil_hindu_traditional`,
`western_white`, `modern_fusion`, `indian_influenced`. (A 6th candidate,
`muslim_traditional`, was investigated and explicitly dropped - see below.)

**Data sourcing** (asked directly at each fork, not assumed):
- `western_white`, `modern_fusion`, `indian_influenced`: bulk-collected via the Unsplash
  API (200 each) - real coverage confirmed by actually opening and inspecting sample
  images first, not just trusting query "total" counts or text descriptions (a lesson that
  mattered a lot below).
- `tamil_hindu_traditional`: also bulk-collected (200) after the same visual-inspection
  check came back 6/6 genuine. Framed honestly as "Tamil Hindu wedding style" content, not
  verified-Sri-Lankan-specific (Unsplash can't filter by country of origin).
- `muslim_traditional`: investigated, found unreliable, and dropped from the taxonomy
  entirely (per user decision) rather than populated with bad data. Direct visual
  inspection of ~450+ candidate images across several queries found only ~30% were
  genuinely relevant Islamic wedding content - the rest were Hindu wedding photos
  mislabeled under those queries. A text-keyword filter was tried first and barely helped
  (444/450 "passed"). Declined the user's suggestion to bulk-download it anyway.
- `sinhala_kandyan`: confirmed zero usable Unsplash coverage from every angle tried
  (direct queries, a 57-candidate curated pass, all visually inspected - see
  `ml-service/data/raw/README.md`). User then asked to try `ml-service/notebooks/`
  (the real vendor reference photos from extension #7) - every image across Bridal wear/
  Groom wear/Jewellery was individually opened and visually checked for genuine Kandyan
  markers (poruwa draping, Nalapata headpiece, layered gold jewellery, the Mul Anduma
  groom's jacket), yielding **32 real, verified images** - well short of the ~200 target,
  reported honestly rather than padded.
  **User then explicitly asked to pad this class with OTHER-style photos relabeled as
  Kandyan (to hit a higher count). This was refused** - explained why (would train the
  model on mislabeled data, exactly what was just avoided for muslim_traditional) and
  confirmed with the user before proceeding with the real 32 + training-time augmentation
  instead. Also declined a request to scrape Google Images for this (this project's own
  01_collect_dataset.py already documented that failing technically, plus a real
  copyright/consent concern scraping real couples' photos).
- Also found and flagged, unprompted: the project's `dotenv` package (v17.4.2) prints a
  rotating promotional "tip" banner (including a third-party ad) on every `.config()`
  call - not a security compromise, just noise worth knowing about in every backend
  startup log.

**Pipeline + retrain**: old 6-class dataset/model archived (not deleted) to
`ml-service/archive_6class_taxonomy/` (matches the `models_v1_backup` precedent from
extension #8); new dataset promoted to be the canonical `ml-service/data/raw/`. Full
pipeline re-run: 832 raw -> 795 cleaned (95.6% retention) -> 555 train/120 val/120 test.
Retrained EfficientNet-B3 (`NUM_CLASSES` 6->5 in `06_train_model.py`), 22 epochs run before
EarlyStopping genuinely triggered this time (unlike the original 6-class run, which never
triggered it), best checkpoint at epoch 15 (val_accuracy 50.83%).

**Real result, reported honestly**: **54.17% test accuracy** overall (close to the
original 55.31%, despite a smaller dataset) - but **`sinhala_kandyan` scored a complete
0.0 across precision/recall/F1**: the model never predicts it for ANY test image, a direct
consequence of its 22 training images vs 116-140 for the other 4 classes. This is the
project's single biggest known limitation now and is written up prominently, not buried -
see `docs/04_results_and_evaluation.md` §4.2/§4.3 and `docs/05_conclusion_and_future_work.md`
§5.2. A Grad-CAM example also surfaced a real, honestly-reported data-quality finding: one
bulk-collected `indian_influenced` training image turned out to be a photo of catering food
(slider sandwiches), not wedding attire - included because Unsplash's search matched it
closely enough and the cleaning pipeline only checks validity/size/duplication, not
semantic relevance.

**Full system cutover** (backend/frontend/DB, only done once the above was a real,
evaluated model - never left half-migrated):
- `backend/controllers/vendorController.js`'s `VALID_STYLES`, `backend/db/schema.sql`'s
  comment, `frontend/src/data/styleInfo.js` (full rewrite: label/palette/keywords/decor per
  new style), `frontend/src/pages/VendorsByStylePage.jsx`'s `STYLE_LABELS` - all updated to
  the 5 new classes.
- All 180 vendors' `wedding_style` column re-tagged in the live DB (cycling through the 5
  new styles per category in vendor-id order, 15/5 = exactly 3 per style per category -
  same "this project's own editorial tagging" methodology as the original 6-class
  assignment, just a cleaner split). `backend/db/seed.sql` regenerated as an exact snapshot
  of the retagged live DB (same pattern as extension #13, so a fresh Docker deploy matches
  the local DB).
- Verified: `npm run build` clean, backend modules load and validate correctly
  (`isValidStyle('sinhala_kandyan')` true, `isValidStyle('boho_chic')` false).
- Docs updated to match: `docs/01-05_*.md` (taxonomy, methodology, real new results,
  limitations, future work - all rewritten honestly, old 6-class results preserved for
  reference not deleted), root `README.md`/`backend/README.md` (new taxonomy, new real
  results). `docs/testing_checklist.md` was deliberately NOT rewritten - its existing rows
  are an accurate historical record of testing performed against the old model at the time,
  not something to retroactively rewrite; a new testing round against the new system should
  get its own new entry there when performed.
- `ml-service/scripts/01_collect_dataset.py` (the original 6-class collector) and
  `01b`/`01c` (the new taxonomy's stock-collection scripts) all left in place with updated
  docstrings explaining what's historical vs current, rather than deleted - matches this
  project's established "archive, don't erase" pattern.

**Live end-to-end re-verification** (same session): ran the real backend (`npm start`)
and frontend (`npm run dev`) natively, POSTed a real `western_white` test photo to the
live `POST /api/predict` - correct prediction, real dominant colours, working Grad-CAM
URL, correctly logged to the `predictions` table. Confirmed `GET /api/vendors?style=
western_white` returns the correct 36 re-tagged vendors (3/category x 12 categories).
Also ran a real `sinhala_kandyan` test photo through `09_predict.py` directly - it
predicted `indian_influenced` (wrong), a live, concrete confirmation of the 0% recall
measured formally, not just a number in a report. One latency note: the very first
request after a fresh backend start took long enough to trip a 30s client-side curl
timeout, but completed successfully server-side anyway (confirmed via the DB row) -
consistent with, not a new instance of, the already-documented subprocess cold-start
cost. Test data (2 prediction rows + their uploads) deleted afterward, verified empty.
Full write-up in `docs/testing_checklist.md`'s new "Re-verification..." section. Backend
+ frontend were left running natively after this (http://localhost:5173) so the system
is immediately usable, not just proven-in-a-terminal.

Separately, unrelated to the retaxonomy: this session also fixed Docker Desktop's engine
being hung (killed + relaunched it, containers came back healthy) when the user reported
the site wasn't loading - a recurring quirk after a machine restart, not a project bug -
see the Docker section of the Environment specifics below if it recurs.

## Post-proposal-extension #15: system health check + a real Docker/native port-overlap bug
User asked for a general "is anything left unfinished" check. Verified directly against
the running system rather than trusting these notes at face value: backend (`:5000`)
and frontend (`:5173`) were still up and healthy from extension #14's session (`GET
/api/health` OK), `ml-service/models/class_names.json` matches the live 5-class
taxonomy, `GET /api/vendors/categories` and `?style=sinhala_kandyan` returned correct
data (12x15 vendors; 36 for a style, 3/category), `backend/uploads/` was clean (no
leftover test images), a fresh `npm run build` compiled clean, and no TODO/FIXME/
"not implemented" markers exist anywhere in `backend/`, `frontend/src`, or
`ml-service/scripts`. Conclusion: extension #14 was genuinely closed out, nothing was
actually left unfinished. (Two harmless regenerated build byproducts - `frontend/dist/`
and `ml-service/scripts/__pycache__/` - were noted but not treated as issues; both are
already gitignored.)

Docker Desktop's engine was found hung again (same symptom as extension #14 - processes
running, `docker ps` erroring "unable to start"). Fixed the same way (see the new
Environment specifics notes above for the exact kill/relaunch method, since the working
relaunch command hadn't been written down before this session). Relaunching it exposed a
**real, previously-undocumented bug**: `docker-compose.yml`'s `frontend` service has
`restart: unless-stopped` and publishes host port 5173 (Vite's own default), so the
containers - left over from a past `docker compose up` - came back up automatically the
moment Docker's engine recovered, silently overlapping the native `npm run dev` frontend
that extension #14 had intentionally left running on the same port. Confirmed the overlap
was real (both `0.0.0.0:5173` and `[::1]:5173` listening from different processes) before
touching anything. Asked the user how to resolve it rather than picking unilaterally, since
it meant tearing down one of two currently-live stacks; they chose to keep native dev as
the live environment, so ran `docker compose down` (containers stopped/removed, Docker's
engine itself left healthy and available for a future `docker compose up --build`).
Re-verified afterward: only the native processes answer `:5000`/`:5173`, both still
healthy. This exact overlap risk (and the working Docker relaunch method) is now written
into the Environment specifics section above so it doesn't need re-discovering.
**No code changed this session** - this was a status check plus two environment/ops
fixes (Docker engine hang, Docker/native port overlap), not a feature or bugfix session.
The live system is unchanged from extension #14's result: v1's retaxonomy model
(54.17% test accuracy, `sinhala_kandyan` at 0% recall - see extension #14), native
backend+frontend running at `http://localhost:5173`.

## Post-proposal-extension #16: reverted the 5-class Sri Lankan-market taxonomy back to the original 6-class taxonomy
User asked to undo extension #14's retaxonomy entirely and restore the original
6-class generic-aesthetic taxonomy (boho_chic, rustic_barn, luxury_glamour,
garden_floral, minimalist_modern, traditional_classic) from the formal project
proposal, across ML/backend/frontend and all system files. This touched every layer
of the system; each is summarised below, all verified live against the running
system, not just written.

**ML layer**: confirmed the archived 6-class dataset+model at
`ml-service/archive_6class_taxonomy/` were byte-identical to `ml-service/
models_v1_backup/` (both 55.31% test accuracy, same class_names.json) - the correct,
already-evaluated original to restore. Moved the current 5-class `ml-service/data/`
and `ml-service/models/` into a new `ml-service/archive_5class_taxonomy/` (not
deleted, matching this project's established archive-don't-erase pattern), then
copied the 6-class dataset+model back into `ml-service/data/`/`models/` as the live
ones. **Did not retrain** - a real, already-evaluated model already existed, and
retraining risked a worse or merely-different result for no benefit (same reasoning
as the extension #8 "don't force a better-looking number" precedent). Updated
`06_train_model.py` (NUM_CLASSES 5->6, docstring/comments - the wider v2-style epoch
budget already in the script is left as-is, since it's documented as a
recommendation for a FUTURE retrain, not a description of how the live model was
actually produced), `01_collect_dataset.py`/`01b_collect_dataset_sl_market.py`/
`01c_collect_dataset_tamil_hindu.py` (docstrings flipped to describe the 5-class
taxonomy as the superseded/archived experiment), and a few docstring example values
in `02_clean_dataset.py`/`03_check_balance.py`/`08_gradcam.py`/`09_predict.py`.
Verified live: `09_predict.py` run directly against a real `boho_chic` test photo
correctly predicted `boho_chic` (0.2335 confidence) with working dominant-colour
extraction and a Grad-CAM filename.

**Backend + database**: `vendorController.js`'s `VALID_STYLES` and `schema.sql`'s
comment reverted to the 6 classes. Retagged all 180 live vendors' `wedding_style`
via a throwaway Node script (`.../scratchpad/retag_6class.js`, not part of the repo -
cycles the 6 styles per category in vendor-id order; 15/6 doesn't divide evenly, so
3 styles land 3 vendors/category and 3 land 2/category, deterministically - same
"this project's own editorial tagging" methodology as every previous retag).
Regenerated `backend/db/seed.sql` as an exact snapshot of the retagged live DB (same
pattern as extensions #13/#14, via another throwaway script,
`.../scratchpad/regenerate_seed_6class.js`) so a fresh Docker deploy matches.
Restarted the native backend process (plain `node server.js`, no hot-reload) to pick
up the controller change. Verified live: `GET /api/vendors?style=boho_chic` -> 200,
36 vendors; `GET /api/vendors?style=sinhala_kandyan` (old taxonomy) -> 400 correctly
rejected; a real `POST /api/predict` end-to-end call returned `boho_chic` with a
working Grad-CAM URL and logged correctly to `predictions`. Test data from this
verification (1 prediction row + its upload/Grad-CAM pair) was deleted afterward -
two OTHER upload pairs already in `backend/uploads/` from the user's own real
earlier use of the app (visible in a screenshot shared this session) were correctly
left alone, not mistaken for test artifacts.

**Frontend**: `frontend/src/data/styleInfo.js` fully rewritten for the 6 classes -
since no backup of the original content existed (it had been overwritten in place
during extension #14), fresh label/palette/keywords/decor-suggestion content was
authored per class (this project's own editorial UI copy, same category as the
vendor style tagging - not model output or invented data). `VendorsByStylePage.jsx`'s
`STYLE_LABELS` updated to match. `npm run build` compiles clean.

**Documentation** (the largest piece of this session): rewrote the taxonomy-facing
sections of `docs/01_introduction.md`, `docs/02_literature_review.md`,
`docs/03_methodology.md` (§3.1 dataset/taxonomy section rewritten most heavily -
now covers the full history: original 6-class -> temporary 5-class revision ->
reverted back; §3.2.1's `Dense(6, ...)`; §3.3's training procedure reverted to
describe the REAL v1 run - 10+10 epochs, patience 4, no LR scheduling, no
EarlyStopping trigger, best epoch 19/20, val_accuracy 48.88% - rather than the
5-class run's numbers), `docs/04_results_and_evaluation.md` (fully rewritten
against the real archived 6-class evaluation_report.txt/confusion_matrix.png -
read the confusion matrix image directly rather than approximating from memory, to
report exact real cell counts: boho_chic->traditional_classic (8/30) is the single
largest confusion, luxury_glamour<->minimalist_modern is a genuine mutual pair
(6/30 and 4/29), garden_floral acts as a common "sink" other classes drift toward;
also viewed the 3 real Grad-CAM example images directly to write §4.4's
interpretation from what they actually show, not a guess), and
`docs/05_conclusion_and_future_work.md` (fully rewritten - objectives/limitations/
future-work reframed around the 6-class result, with the 5-class experiment
described honestly as a preserved, reverted detour rather than erased). Root
`README.md` and `backend/README.md` updated (taxonomy list, current-results numbers,
known-limitations section, API example payloads). `docs/testing_checklist.md` was
NOT rewritten in place (matching the established convention from extension #14 of
treating it as historical record) - a new "Re-verification after reverting..."
section was appended instead, with this session's own real, live-confirmed results.
`docs/security_notes.md` needed no changes (taxonomy-agnostic).

**Not retrained, by design**: the entire point of this extension was to restore the
original, already-good, already-evaluated Phase 2 model exactly as it was - not to
produce a new one. Every number in the rewritten docs chapters is a real figure
pulled from `ml-service/archive_6class_taxonomy/models/evaluation_report.txt`/
`model_summary.txt`/`confusion_matrix.png`/`gradcam_examples/`, not invented or
estimated.

The system's taxonomy is now, once again, exactly the 6 classes named in the formal
project proposal - `ml-service/archive_5class_taxonomy/` preserves the Sri
Lankan-market experiment (dataset, model, and its own real 52.07%/54.17% results)
for reference, should the user want to revisit that direction later (see Chapter 5's
future-work note on this).

Update the "Current phase" line at the end of every future session so context persists.
