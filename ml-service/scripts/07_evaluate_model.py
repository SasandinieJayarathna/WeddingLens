"""
07_evaluate_model.py
---------------------
IN ONE SENTENCE: grades the trained model on photos it has NEVER seen before,
to get an honest score for how good it really is.

Phase 2, Step 3: evaluate the trained model on the held-out test set.

The test set was never shown to the model during training or validation,
so its performance here is the most honest estimate of how well the model
will do on brand-new photos a real user uploads.

Outputs:
  - ml-service/models/evaluation_report.txt (accuracy + full classification report)
  - ml-service/models/confusion_matrix.png (heatmap of predicted vs actual class)
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODELS_DIR = SCRIPT_DIR.parent / "models"

IMG_SIZE = (300, 300)
BATCH_SIZE = 32

MODEL_PATH = MODELS_DIR / "weddinglens_effnetb3.keras"
CLASS_NAMES_JSON = MODELS_DIR / "class_names.json"
REPORT_TXT = MODELS_DIR / "evaluation_report.txt"
CONFUSION_PNG = MODELS_DIR / "confusion_matrix.png"


def main():
    """Entry point: loads the trained model, runs it once over the held-out
    test set, then prints/saves accuracy, a full classification report, and a
    confusion matrix heatmap."""
    print("=" * 70)
    print("WeddingLens - Model Evaluation (Phase 2, Step 3)")
    print("=" * 70)

    class_names = json.loads(CLASS_NAMES_JSON.read_text(encoding="utf-8"))

    test_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_DIR / "test",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False,  # keep order so predictions line up with true labels
    )
    # image_dataset_from_directory infers class order from folder names,
    # which should match class_names.json (both sorted alphabetically),
    # but verify anyway rather than silently trusting it.
    if test_ds.class_names != class_names:
        raise RuntimeError(
            f"Class order mismatch! test set folders={test_ds.class_names} "
            f"but training used {class_names}. Predictions would be mislabeled."
        )

    print(f"Loading model from {MODEL_PATH} ...")
    model = tf.keras.models.load_model(MODEL_PATH)

    y_true = np.concatenate([y.numpy() for _, y in test_ds])
    print("Running predictions on the test set...")
    y_pred_probs = model.predict(test_ds)
    y_pred = np.argmax(y_pred_probs, axis=1)

    test_accuracy = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred, target_names=class_names, digits=4)

    print(f"\nTest accuracy: {test_accuracy:.4f}")
    print("\nClassification report:")
    print(report)

    # ---------------- Confusion matrix heatmap ----------------
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(8, 7))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="rocket_r",
        xticklabels=class_names, yticklabels=class_names,
    )
    plt.xlabel("Predicted style")
    plt.ylabel("Actual style")
    plt.title(f"WeddingLens Confusion Matrix (test accuracy={test_accuracy:.2%})")
    plt.xticks(rotation=30, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(CONFUSION_PNG, dpi=150)
    print(f"\nConfusion matrix saved to: {CONFUSION_PNG}")

    # ---------------- Save full text report ----------------
    lines = [
        "WeddingLens - Test Set Evaluation Report",
        "=" * 50,
        f"Test set size: {len(y_true)} images",
        f"Test accuracy: {test_accuracy:.4f}",
        "",
        "Classification report (precision / recall / f1-score per class):",
        report,
    ]
    REPORT_TXT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Full report saved to: {REPORT_TXT}")


if __name__ == "__main__":
    main()
