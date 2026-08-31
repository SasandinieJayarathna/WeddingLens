"""
08_gradcam.py
--------------
IN ONE SENTENCE: makes 3 example "heatmap" pictures showing which parts of a
photo the AI looked at most - for the dissertation write-up.

Phase 2, Step 4: Grad-CAM explainability demo.

What is Grad-CAM, in plain language (useful to explain in a viva/defense)?
  Our model is a "black box" by default - it gives a prediction but not a
  reason. Grad-CAM ("Gradient-weighted Class Activation Mapping") opens
  that box a little. Here's the idea:

  1. The last convolutional layer of a CNN produces a stack of feature
     maps - each one highlights where in the image a particular learned
     pattern (a texture, a shape, a colour combo) appeared.
  2. We ask: "if I nudge each of those feature maps up slightly, how much
     does that increase the model's confidence in its predicted class?"
     That "how much" is a gradient, computed via backpropagation - the same
     mechanism used to train the network, just run for a different purpose
     here (explaining a decision instead of updating weights).
  3. Feature maps that matter more to the prediction get a bigger weight.
     We combine all the feature maps using those weights into a single
     heatmap the same size as the last conv layer's output.
  4. We resize that heatmap up to the original image size and overlay it
     in colour (red/yellow = strongly influenced the prediction, blue/dark
     = had little influence).

  In short: Grad-CAM answers "which pixels made the model say boho_chic?"
  by tracing which regions the deciding layer paid the most attention to.

This script runs Grad-CAM on 3 sample test images (one correctly classified,
one misclassified if possible, one random) purely to produce fixed
illustrative examples for the dissertation. The actual Grad-CAM function
lives in gradcam_utils.py and is reused live by 09_predict.py so real users
uploading photos through the web app get the same explainability, not just
these 3 fixed demo images.
"""

import json
from pathlib import Path

import numpy as np
import tensorflow as tf
import cv2

from gradcam_utils import generate_gradcam, load_and_preprocess

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODELS_DIR = SCRIPT_DIR.parent / "models"
GRADCAM_DIR = MODELS_DIR / "gradcam_examples"
GRADCAM_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODELS_DIR / "weddinglens_effnetb3.keras"
CLASS_NAMES_JSON = MODELS_DIR / "class_names.json"


def pick_sample_images(class_names, model):
    """Pick 3 test images: one correctly classified, one misclassified (if
    any exist), and one random - so the Grad-CAM examples demonstrate both
    a success and a failure case."""
    test_dir = DATA_DIR / "test"
    samples = []
    for category in class_names:
        for f in sorted((test_dir / category).glob("*.jpg")):
            samples.append((f, category))

    correct, incorrect = None, None
    for image_path, true_label in samples:
        _, batched = load_and_preprocess(image_path)
        preprocessed = tf.keras.applications.efficientnet.preprocess_input(batched.copy())
        pred_probs = model.predict(preprocessed, verbose=0)[0]
        pred_label = class_names[int(np.argmax(pred_probs))]
        if pred_label == true_label and correct is None:
            correct = (image_path, true_label)
        elif pred_label != true_label and incorrect is None:
            incorrect = (image_path, true_label)
        if correct and incorrect:
            break

    chosen = []
    if correct:
        chosen.append(("correctly_classified", correct[0]))
    if incorrect:
        chosen.append(("misclassified", incorrect[0]))
    for image_path, true_label in samples:
        if image_path not in [c[1] for c in chosen]:
            chosen.append(("random_sample", image_path))
            break
    return chosen


def main():
    """Entry point: picks 3 illustrative test images, runs the shared
    generate_gradcam() on each, and saves the overlay images for the
    dissertation."""
    print("=" * 70)
    print("WeddingLens - Grad-CAM Explainability (Phase 2, Step 4)")
    print("=" * 70)

    class_names = json.loads(CLASS_NAMES_JSON.read_text(encoding="utf-8"))
    model = tf.keras.models.load_model(MODEL_PATH)

    print("Selecting sample test images (correct / misclassified / random)...")
    samples = pick_sample_images(class_names, model)

    for label, image_path in samples:
        overlay, class_index, raw_score = generate_gradcam(image_path, model)
        predicted_style = class_names[class_index]
        out_path = GRADCAM_DIR / f"{label}_{image_path.stem}_pred-{predicted_style}.jpg"
        cv2.imwrite(str(out_path), overlay)
        print(f"[{label}] {image_path.name} -> predicted: {predicted_style}  saved: {out_path.name}")

    print(f"\nGrad-CAM overlays saved to: {GRADCAM_DIR}")


if __name__ == "__main__":
    main()
