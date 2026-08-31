"""
09_predict.py
--------------
IN ONE SENTENCE: the script that actually runs when a real user uploads a
photo - guesses the style, picks out its colours, and draws the heatmap.

Phase 3: multi-image inference + explainability, for real use by the backend.

This is the script the Node.js backend calls (see
backend/controllers/predictController.js) to turn one or more uploaded photos
into a predicted wedding style, a confidence score, AND a Grad-CAM heatmap
image per photo - so a real user gets the same "why did it think that"
explanation that's discussed in the dissertation, not just a bare label.

Accepts ONE OR MORE image paths so a multi-image upload (or a 2-image style
comparison) only pays TensorFlow's import/model-load cost ONCE per request,
not once per image - see docs/security_notes.md and 03_methodology.md for why
that cold-start cost matters here (this backend spawns a fresh Python process
per request rather than running a persistent inference service).

Usage:
    python 09_predict.py <path_to_image_1> [<path_to_image_2> ...]

Always prints a single line of JSON to stdout containing a LIST, one entry
per input path in the same order, e.g. for two images:
    [{"predicted_style": "boho_chic", "confidence": 0.8734, "all_scores": {...},
      "dominant_colors": ["#8A6E4B", "#F3E9DC", ...],
      "gradcam_filename": "upload_1_gradcam.jpg"},
     {"error": "Image not found: ..."}]

dominant_colors is a real, photo-specific colour palette (k-means over the
actual uploaded image's pixels - see extract_dominant_colors below), not a
static per-style reference palette.

A per-image failure (bad file, etc.) produces an {"error": ...} entry in that
image's position rather than aborting the whole batch - one bad image
shouldn't sink the other images in the same upload.

Printing JSON (rather than free-form text) is deliberate: it's the easiest
format for the Node.js backend to parse reliably from a subprocess's output.
Each Grad-CAM overlay is saved as a new file in the SAME folder as its input
image (so if the backend passes paths inside its uploads/ folder, the
overlays land there too and can be served the same way).
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from sklearn.cluster import KMeans

from gradcam_utils import generate_gradcam

SCRIPT_DIR = Path(__file__).resolve().parent
MODELS_DIR = SCRIPT_DIR.parent / "models"
MODEL_PATH = MODELS_DIR / "weddinglens_effnetb3.keras"
CLASS_NAMES_JSON = MODELS_DIR / "class_names.json"
IMG_SIZE = (300, 300)

_model = None
_class_names = None


def get_model():
    """Load the model once and cache it (useful if this module is imported
    repeatedly instead of run fresh each time)."""
    global _model, _class_names
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run 06_train_model.py first.")
        _model = tf.keras.models.load_model(MODEL_PATH)
        _class_names = json.loads(CLASS_NAMES_JSON.read_text(encoding="utf-8"))
    return _model, _class_names


def extract_dominant_colors(image_path: Path, top_n: int = 5, n_clusters: int = 8, min_dist: float = 28.0) -> list:
    """Extract the top_n most representative colours from the ACTUAL
    uploaded photo, returned as hex strings ordered most-to-least dominant.

    This replaces the old static, hand-picked per-style palette in
    frontend/src/data/styleInfo.js (illustrative reference colours, not
    derived from any real photo) with a genuine, photo-specific palette -
    the Style Dashboard's colour swatches now reflect what the user actually
    uploaded, not a generic stand-in for the predicted category.

    A plain "cluster by raw pixel count" k-means (the first version of this
    function) turned out to systematically favour large, visually
    unremarkable regions - blurry out-of-focus foreground foliage, dim
    venue backgrounds, deep shadow - over the smaller but visually
    meaningful decor colours (flowers, table linens, sky) a person would
    actually call "the photo's palette", simply because those regions cover
    more raw pixels. Verified this directly against several real test
    photos before fixing it (see CLAUDE.md's palette-extraction notes).
    Two adjustments address that:

    1. Each pixel is weighted by how "vivid" it is (HSV saturation) before
       clustering, with near-black shadow/background pixels specifically
       suppressed - without penalising genuine whites/pastels, which are
       low-saturation but NOT dark, and are legitimate decor colours.
    2. Clustering uses more clusters than we display (n_clusters=8 for a
       5-colour output) and then greedily picks the top_n most-weighted
       clusters that are each perceptually distinct from what's already
       picked (min_dist in RGB space) - otherwise several near-identical
       "muddy" shadow/background greys can crowd out a small but visually
       distinct accent colour (e.g. a single vivid flower) that would
       genuinely stand out to a person looking at the photo.

    A photo that's genuinely dark overall (e.g. a night portrait) will
    still correctly come back mostly dark - this isn't about hiding real
    colours, only about not letting incidental background/shadow pixels
    outvote the photo's actual visual character.
    """
    img = cv2.imread(str(image_path))
    if img is None:
        return []
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    # Downscale before clustering - a 5-colour summary doesn't need every
    # pixel, and this keeps k-means fast even on a large upload.
    small = cv2.resize(img, (150, 150), interpolation=cv2.INTER_AREA)
    pixels = small.reshape(-1, 3).astype(np.float64)

    n_unique = len(np.unique(pixels, axis=0))
    if n_unique < 1:
        return []
    n_clusters = min(n_clusters, n_unique)

    hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV).astype(np.float64)
    sat = hsv[..., 1].reshape(-1) / 255.0
    val = hsv[..., 2].reshape(-1) / 255.0
    sat_component = 0.5 + 0.5 * sat
    dark_component = np.where(val < 0.15, np.maximum(0.03, (val / 0.15) ** 2), 1.0)
    pixel_weights = sat_component * dark_component

    kmeans = KMeans(n_clusters=n_clusters, n_init=4, random_state=42)
    kmeans.fit(pixels, sample_weight=pixel_weights)
    labels = kmeans.predict(pixels)

    candidates = []  # (weighted_population, rgb) per cluster, largest first
    for idx in range(n_clusters):
        mask = labels == idx
        if not mask.any():
            continue
        candidates.append((pixel_weights[mask].sum(), pixels[mask].mean(axis=0)))
    candidates.sort(key=lambda c: -c[0])

    selected = []
    for _, rgb in candidates:
        if len(selected) >= top_n:
            break
        if all(np.linalg.norm(rgb - chosen) >= min_dist for chosen in selected):
            selected.append(rgb)
    # If distinctness filtering left us short (e.g. a genuinely
    # monochrome photo), fill remaining slots with the next-best clusters
    # regardless of distance rather than returning fewer than top_n.
    if len(selected) < top_n:
        for _, rgb in candidates:
            if len(selected) >= top_n:
                break
            if not any(np.array_equal(rgb, chosen) for chosen in selected):
                selected.append(rgb)

    return [
        "#{:02X}{:02X}{:02X}".format(*rgb.clip(0, 255).astype(int))
        for rgb in selected
    ]


def predict_image(image_path: str) -> dict:
    """Runs the full pipeline for ONE image: classify it, extract its real
    colour palette, and generate its Grad-CAM heatmap. The palette and
    heatmap steps are each wrapped so a failure in either one doesn't lose
    the underlying prediction - they degrade gracefully (empty palette /
    a gradcam_error field) rather than failing the whole request."""
    model, class_names = get_model()
    image_path = Path(image_path)

    img = tf.keras.utils.load_img(image_path, target_size=IMG_SIZE)
    img_array = tf.keras.utils.img_to_array(img)
    batched = np.expand_dims(img_array, axis=0)
    preprocessed = tf.keras.applications.efficientnet.preprocess_input(batched)

    probs = model.predict(preprocessed, verbose=0)[0]
    predicted_index = int(np.argmax(probs))

    result = {
        "predicted_style": class_names[predicted_index],
        "confidence": round(float(probs[predicted_index]), 4),
        "all_scores": {name: round(float(p), 4) for name, p in zip(class_names, probs)},
    }

    # Real colour palette extracted from this specific photo (see
    # extract_dominant_colors' docstring for why this replaced the old
    # static per-style palette). Never let this block a prediction - an
    # empty list just means the frontend falls back to the style default.
    try:
        result["dominant_colors"] = extract_dominant_colors(image_path)
    except Exception:  # noqa: BLE001
        result["dominant_colors"] = []

    # Generate the Grad-CAM overlay for the predicted class and save it next
    # to the uploaded image. If this fails for any reason, we still return
    # the prediction - explainability is a bonus, not something that should
    # block the core feature from working.
    try:
        overlay_bgr, _, _ = generate_gradcam(image_path, model, class_index=predicted_index)
        gradcam_filename = f"{image_path.stem}_gradcam.jpg"
        gradcam_path = image_path.parent / gradcam_filename
        cv2.imwrite(str(gradcam_path), overlay_bgr)
        result["gradcam_filename"] = gradcam_filename
    except Exception as exc:  # noqa: BLE001
        result["gradcam_error"] = str(exc)

    return result


def main():
    """Entry point called by the Node.js backend: predicts every image path
    given on the command line and prints ONE JSON array to stdout, in the
    same order as the input paths (see the module docstring for the exact
    shape). A per-image failure becomes an {"error": ...} entry in that
    image's slot rather than aborting the whole batch."""
    if len(sys.argv) < 2:
        print(json.dumps([{"error": "Usage: python 09_predict.py <path_to_image> [<path_to_image_2> ...]"}]))
        sys.exit(1)

    image_paths = sys.argv[1:]
    results = []
    for image_path in image_paths:
        if not Path(image_path).exists():
            results.append({"error": f"Image not found: {image_path}"})
            continue
        try:
            results.append(predict_image(image_path))
        except Exception as exc:  # noqa: BLE001 - surface any failure as JSON, not a raw traceback
            results.append({"error": str(exc)})

    print(json.dumps(results))
    # Exit non-zero only if EVERY image failed - a partial batch success is
    # still useful output for the caller to parse and act on.
    if all("error" in r for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
