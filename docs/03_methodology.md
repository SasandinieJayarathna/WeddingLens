# 3. Methodology

## 3.1 Dataset collection

### 3.1.1 Taxonomy: a generic-aesthetic set, briefly revised, then reverted

The system's style taxonomy is the **6-class generic-aesthetic set** fixed by the
original project proposal: `boho_chic`, `rustic_barn`, `luxury_glamour`,
`garden_floral`, `minimalist_modern`, `traditional_classic`. Both the taxonomy's
history and the current dataset are documented here for transparency.

Partway through the project, this taxonomy was temporarily replaced with a 5-class
Sri Lankan wedding-market-specific set (`sinhala_kandyan`, `tamil_hindu_traditional`,
`western_white`, `modern_fusion`, `indian_influenced`), motivated by wanting the
classifier to reflect the wedding styles actually represented in the Sri Lankan
market this system targets rather than a generic Western aesthetic taxonomy. That
revision involved genuine, honestly-reported data-collection work — including a
methodological finding that a search API's reported result count is not reliable
evidence of relevance (confirmed by manually inspecting sample images, not just
trusting text descriptions or "total" counts), and a materially under-sized
`sinhala_kandyan` class (37 hand-curated images versus ~166–200 for the other four)
that the resulting model never learned to predict at all (0% precision/recall/F1).
That taxonomy, its full dataset-sourcing methodology, and its two trained models are
preserved for reference at `ml-service/archive_5class_taxonomy/`, not deleted.

**This taxonomy was then reverted back to the original 6-class set above, at the
project owner's request, to stay aligned with the formal project proposal document.**
The dataset and model described in the rest of this chapter are the ORIGINAL 6-class
ones (1,200 raw → 1,181 cleaned images, 55.31% test accuracy) — the same ones
produced in Phase 2 of this project, restored from
`ml-service/archive_6class_taxonomy/` rather than retrained from scratch, since a
real, already-evaluated model already existed and retraining risked a worse or
merely different result for no methodological benefit (the same reasoning applied
to the earlier decision, in Post-proposal-extension #8, not to force retraining
results to look better than they were).

### 3.1.2 Source

Images across all 6 categories were collected via the **Unsplash API**
(`ml-service/scripts/01_collect_dataset.py`), rather than scraping Google/Bing
Images directly. That approach was tried first (via the `icrawler` package, per the
original project plan) and found broken in practice: Google's page structure had
changed since `icrawler`'s parser was written, so every request crashed with
`TypeError: 'NoneType' object is not iterable`, and a Bing fallback technically
didn't crash but returned completely unrelated images (random news photos,
wallpapers) — almost certainly bot-detection serving fallback content instead of
real search results. The Unsplash API is the official, structured way to search
their photo library: a stable JSON response, and the images are free to use
(Unsplash License), which matters for a dissertation dataset.

200 images were targeted per category via 2–3 search phrases per style, downloaded
into `ml-service/data/raw/<category>/` with metadata logged to
`ml-service/data/raw/attribution_log.csv`.

### 3.1.3 Cleaning and deduplication

Raw images were processed by `ml-service/scripts/02_clean_dataset.py`, which:

1. Verified every file opens as a valid image (Pillow), discarding corrupt downloads.
2. Discarded any image smaller than 200×200 pixels.
3. Computed a perceptual hash (`imagehash.phash`) for every remaining image and
   discarded near-duplicates — images whose hash differed by a Hamming distance of
   5 or less from one already kept — to reduce the risk of visually identical or
   near-identical photos appearing in both the training and test sets after the
   later split.
4. Converted all surviving images to RGB JPEG and renamed them sequentially per
   category (e.g. `boho_chic_001.jpg`).

Of **1,200 raw images collected** across the 6 categories, **1,181 survived cleaning
(98.4% retention)**; 19 images were removed as corrupt/undersized/near-duplicate. Per
category, cleaned counts ranged 192–200 images. The full per-category breakdown:

| Category | Raw | Cleaned | Train | Val | Test |
|---|---|---|---|---|---|
| boho_chic | 200 | 198 | 138 | 30 | 30 |
| garden_floral | 200 | 200 | 140 | 30 | 30 |
| luxury_glamour | 200 | 197 | 137 | 30 | 30 |
| minimalist_modern | 200 | 192 | 134 | 29 | 29 |
| rustic_barn | 200 | 194 | 135 | 29 | 30 |
| traditional_classic | 200 | 200 | 140 | 30 | 30 |

(See `ml-service/data/dataset_summary.txt` for this table as generated directly by
`ml-service/scripts/05_dataset_summary.py`.)

### 3.1.4 Train/validation/test split

The cleaned dataset was split using scikit-learn's `train_test_split` with a fixed
`random_state=42`, in two steps (70% train, then the remaining 30% split evenly into
15% validation / 15% test), performed independently per category so that class
balance is preserved across all three splits. The fixed seed makes the split fully
reproducible. Final counts: **824 training images, 178 validation images, 179 test
images**, with every category landing within 192–200 cleaned images (i.e. no severely
under-represented class, unlike the 5-class taxonomy experiment's `sinhala_kandyan`
problem described in §3.1.1).

## 3.2 Model architecture

### 3.2.1 Base architecture and justification

The classifier uses **EfficientNet-B3** (Tan & Le, 2019), pretrained on ImageNet, as
a frozen/fine-tunable feature extractor, with a lightweight classification head added
on top: `GlobalAveragePooling2D` → `Dropout(0.3)` → `Dense(6, activation="softmax")`.
EfficientNet-B3 was chosen over a larger EfficientNet variant (e.g. B5–B7) or a
non-EfficientNet architecture for a specific, practical reason: this project's
model training runs on **CPU only** — native TensorFlow GPU support was discontinued
for TensorFlow ≥ 2.11 on Windows, and the development machine's NVIDIA GeForce MX550
GPU could therefore not be used by TensorFlow 2.21 (the version installed for this
project) without a WSL2 or DirectML-plugin setup that was out of scope. EfficientNet-B3
represents a middle point in the EfficientNet family: substantially more accurate
than B0 on ImageNet, while remaining small enough (≈10.8M parameters in the base
model, per `ml-service/models/model_summary.txt`) to train multiple epochs on CPU in
a practical timeframe for this project (in practice, roughly 25–70 seconds per epoch
over 824 training images at batch size 32 on the development machine).

### 3.2.2 Input pipeline

Images are loaded at 300×300 resolution (EfficientNet-B3's native input size) and
batched at 32. Data augmentation — random horizontal flip, ±10% rotation, ±10% zoom,
and ±10% contrast — is applied to the training set only, via a
`tf.keras.Sequential` block of Keras preprocessing layers, so the model sees a
slightly different version of each training image on every epoch without ever
augmenting validation or test data. EfficientNet's own `preprocess_input` function
is applied after augmentation, matching the exact preprocessing EfficientNet-B3 was
pretrained with.

## 3.3 Training procedure

Training followed standard two-phase transfer-learning practice. The run reported in
this section and in Chapter 4 is the **original v1 training run** — the same one
originally produced in Phase 2 of this project, restored (not repeated) from
`ml-service/archive_6class_taxonomy/` per §3.1.1's decision not to retrain when a
real, already-evaluated model already existed:

- **Phase A (feature extraction)**: the EfficientNet-B3 base was frozen entirely
  (`base_model.trainable = False`); only the new classification head was trained,
  for up to 10 epochs, with the Adam optimiser at a learning rate of 1×10⁻⁴.
- **Phase B (fine-tuning)**: the last 30 layers of EfficientNet-B3 were unfrozen and
  trained jointly with the classification head for up to a further 10 epochs, at a
  reduced learning rate of 1×10⁻⁵, so the pretrained weights are nudged toward the
  wedding-photo domain without being destroyed by large gradient updates.

Both phases used `sparse_categorical_crossentropy` loss and accuracy as the
monitored metric, with `EarlyStopping` (patience 4, monitoring validation loss,
restoring the best weights) and `ModelCheckpoint` (saving only the best model by
validation loss) applied per phase, and no learning-rate scheduling.

**Training ran the full fixed 20-epoch budget (10+10) without EarlyStopping
triggering** — the best checkpoint (by validation loss) was restored from **epoch 19
of 20**, with **validation accuracy 48.88%, validation loss 1.3729**. That
EarlyStopping never triggered indicates training was cut off by the fixed budget
rather than having genuinely plateaued/converged; a wider epoch budget and patience
(15+35 epochs, patience 6, plus `ReduceLROnPlateau`) was tried in a later experiment
(Post-proposal-extension #8, "v2") specifically to test this, but scored *worse* on
the real test set (53.63% vs this run's 55.31% — see Chapter 4), so this original v1
run remains the one actually deployed. `ml-service/scripts/06_train_model.py`'s
current constants reflect that wider v2-style budget as the recommended starting
point for any future retraining attempt, not a description of how this reported run
was produced. See Chapter 4 for the corresponding test-set results.

## 3.4 Grad-CAM explainability methodology

Grad-CAM (Selvaraju et al., 2017) was implemented from first principles in
`ml-service/scripts/gradcam_utils.py` (see Chapter 2 for why Grad-CAM specifically
was chosen over alternatives such as CAM or LIME). In plain terms: for a given image
and its predicted class, Grad-CAM computes the gradient of that class's output score
with respect to the feature maps of a chosen convolutional layer (here, EfficientNet-B3's
final convolutional layer, `top_conv`); averages each feature map's gradient into a
single importance weight; combines the feature maps using those weights into one
heatmap; and resizes that heatmap to the original image's dimensions, overlaying it
in colour (red/yellow = strongly influenced the prediction). This is implemented as a
reusable function (`generate_gradcam`) called both by the standalone demonstration
script (`08_gradcam.py`, which produces one correctly-classified, one
misclassified, and one random example for this document set) and by the live
inference script (`09_predict.py`), so that a real user uploading a photo through the
web application receives the identical explainability treatment discussed here, not
a separate, simplified version.

A genuine implementation bug was found and fixed during this project's own
development: the function locating EfficientNet-B3's sub-model inside the larger
Keras functional model originally selected the **first** nested `tf.keras.Model`
instance it found — but the data-augmentation block (a `Sequential` of
`RandomFlip`/`RandomRotation`/`RandomZoom`/`RandomContrast` layers) is *also* a
`tf.keras.Model` subclass and appears earlier in the layer list than the
EfficientNet-B3 sub-model itself, so the function was silently returning the wrong
sub-model (one with no `top_conv` layer at all). This was caught because it produced
an immediate, loud error (`ValueError: No such layer: top_conv`) rather than a silent
wrong result, and was fixed by searching specifically for the nested model that
contains a layer named `top_conv`, rather than trusting layer order.

## 3.5 System architecture

- **ml-service** (Python): the dataset pipeline and model described above, plus
  `09_predict.py`, a script that loads the trained model once and accepts one or
  more image paths, printing a JSON array containing each image's predicted style,
  per-class confidence scores, a photo-specific dominant-colour palette, and a
  Grad-CAM heatmap filename.
- **backend** (Node.js/Express + PostgreSQL): exposes `POST /api/predict` (accepts
  1-5 image uploads via `multer`, invokes `09_predict.py` once as a child process for
  the whole batch, logs each result to a `predictions` table, and returns each
  prediction plus URLs for the original image and its Grad-CAM overlay),
  `GET /api/vendors` (parameterised SQL queries against a `vendors` table, by
  detected style or by category), and JWT-based optional user accounts for a
  personal "inspiration board". The choice to invoke Python as a subprocess per
  request, rather than running a persistent Python microservice, was made
  deliberately for simplicity given this project's low expected request volume; the
  trade-off (every request re-pays TensorFlow's import/model-load cost) is
  documented in `docs/security_notes.md` and revisited in Chapter 5.
- **frontend** (React + Vite): an `UploadPage` (drag-and-drop upload with
  client-side file type/size validation, single or multi-image), results pages
  showing predicted style, confidence breakdown, colour palette, and the Grad-CAM
  heatmap, a dedicated two-image comparison page, and vendor-browsing pages (by
  detected style, or general browsing by category) - connected to the backend via a
  shared axios instance configured from an environment variable rather than a
  hardcoded URL.

Full request/response examples and the schema are documented in `backend/README.md`
and `backend/db/schema.sql`.

### 3.5.1 Deviation from the proposed technology stack: Flask → Node.js/Express

The project proposal (§5, §8) listed **Flask** among the intended technologies
alongside TensorFlow, React.js, and PostgreSQL. The system as actually built uses
**Node.js/Express** for the backend instead. This is reported here explicitly, in
the same spirit as the dataset-source deviation in §3.1.1, rather than silently
building one thing while the proposal document still describes another.

The practical reasoning: this project's backend is a comparatively thin layer -
handle a file upload, invoke the Python model as a subprocess, run a handful of
parameterised SQL queries, and serve JSON - work Express does with very little
ceremony, and Node's `child_process` module (`execFile`, used in
`backend/controllers/predictController.js`) invokes the Python prediction script
just as directly as Flask would via `subprocess`. The two frameworks are
functionally interchangeable for what this backend actually does; neither one is
required by the ML pipeline itself (TensorFlow, scikit-learn, OpenCV, and every
other ML dependency remain pure Python in `ml-service/`, untouched by this choice).
Choosing Express did mean maintaining two languages across the stack (Python for
`ml-service/`, JavaScript for `backend/`+`frontend/`) rather than Python end-to-end,
which is the main trade-off of this deviation - a Flask backend would have let the
whole non-ML-training codebase share one language with the model-serving script.

No functionality described in the proposal was lost as a result of this choice: the
subprocess-invocation architecture, the API surface, and every proposed feature
(multi-image upload, style dashboard, Grad-CAM, vendor matching, style comparison,
user profiles) were all built and verified end-to-end regardless of which backend
framework runs them (see `docs/testing_checklist.md`).

### 3.5.2 Containerisation (Docker)

Docker was also listed among the proposal's resources (§8) but was not used during
initial development - the system was built and tested directly against the host
machine's Node.js, Python venv, and PostgreSQL service (see the "Environment
specifics" section of `CLAUDE.md`). This gap was closed after initial development by
adding a `docker-compose.yml` at the repository root, plus a `Dockerfile` for each
of the backend and frontend:

- **db**: the official `postgres:16-alpine` image, with `backend/db/schema.sql` and
  `backend/db/seed.sql` mounted into Postgres's `docker-entrypoint-initdb.d/`
  directory so the schema and the real 180-vendor seed data are applied
  automatically on first startup - no manual `psql` step.
- **backend**: a single image containing both Node.js (for Express) and Python
  (installed via a venv, mirroring the non-Docker `ml-service/venv` setup) so the
  same subprocess-invocation design described in §3.5 works unchanged inside the
  container - `09_predict.py` and the trained model are copied in, but the training
  data/notebooks are deliberately excluded (see `.dockerignore`) since they aren't
  needed to serve a prediction.
- **frontend**: a multi-stage build - the Vite production bundle is built in a
  Node.js stage, then served by a lightweight `nginx` stage with an SPA fallback
  route (`frontend/nginx.conf`) so client-side routes work on a direct page load,
  not only via in-app navigation.

This closes the resource gap identified against the proposal. It was written against
each component's actual, already-verified runtime requirements (the same
environment variables, ports, and file paths the non-Docker setup documented in
`backend/README.md`/`frontend/README.md` uses), and was subsequently
**build-verified live** after Docker Desktop was installed on the development
machine: `docker compose up --build` succeeded for all three services, and the full
request path was confirmed end-to-end against the running containers - a real test
image POSTed to the containerized `POST /api/predict` correctly returned a
prediction, a photo-specific colour palette, and a working Grad-CAM heatmap URL
(confirming Python/TensorFlow/OpenCV are correctly installed and the subprocess
design from §3.5 works unchanged inside the container), the prediction was
correctly logged to the containerized PostgreSQL database, `GET
/api/vendors/categories` returned all 12 categories with 15 vendors each (confirming
the seed data auto-loaded via `docker-entrypoint-initdb.d/`), and the frontend
correctly served both its root route and a deep client-side route
(`/vendors/category/florist`) with a 200 rather than nginx's default 404, confirming
the SPA fallback configuration works. Test data created during this verification was
deleted from the containerized database and uploads volume afterward.
