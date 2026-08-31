"""
10_model_summary.py
---------------------
IN ONE SENTENCE: collects the training and test results into one readable
summary file, so the key numbers are easy to find in one place.

Phase 2, Step 6: write a single summary file pulling together the key
numbers from training and evaluation, for the dissertation's results
chapter - so there's one place to look instead of re-reading several
scripts' output.
"""

import json
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
MODELS_DIR = SCRIPT_DIR.parent / "models"

HISTORY_CSV = MODELS_DIR / "training_history.csv"
EVAL_REPORT = MODELS_DIR / "evaluation_report.txt"
MODEL_PATH = MODELS_DIR / "weddinglens_effnetb3.keras"
CONFUSION_PNG = MODELS_DIR / "confusion_matrix.png"
CURVES_PNG = MODELS_DIR / "training_curves.png"
GRADCAM_DIR = MODELS_DIR / "gradcam_examples"
OUTPUT_FILE = MODELS_DIR / "model_summary.txt"


def main():
    """Entry point: reads training_history.csv and evaluation_report.txt
    (both produced by earlier scripts) and writes a single consolidated
    model_summary.txt combining the key numbers plus known limitations."""
    lines = []

    # Prints a line AND stores it, so the same text ends up both on screen
    # and in the saved summary file.
    def emit(text=""):
        print(text)
        lines.append(text)

    emit("=" * 70)
    emit("WeddingLens - Model Summary (Phase 2 complete)")
    emit("=" * 70)

    history_df = pd.read_csv(HISTORY_CSV)
    best_epoch = int(history_df["val_loss"].idxmin())
    best_val_acc = float(history_df.loc[best_epoch, "val_accuracy"])
    best_val_loss = float(history_df.loc[best_epoch, "val_loss"])
    total_epochs_run = len(history_df)

    class_names = json.loads((MODELS_DIR / "class_names.json").read_text(encoding="utf-8"))

    emit("")
    emit("Training:")
    emit(f"  Classes ({len(class_names)}): {', '.join(class_names)}")
    emit(f"  Architecture: EfficientNet-B3 (ImageNet pretrained) + GlobalAveragePooling2D "
         f"+ Dropout(0.3) + Dense({len(class_names)}, softmax)")
    emit(f"  Total epochs run: {total_epochs_run} (Phase A: frozen base, Phase B: fine-tuned last 30 layers)")
    emit(f"  Best epoch (lowest val_loss): {best_epoch}")
    emit(f"  Best validation accuracy: {best_val_acc:.4f}")
    emit(f"  Best validation loss: {best_val_loss:.4f}")
    emit(f"  Hardware: CPU only (no native TensorFlow GPU support on Windows for TF >= 2.11)")

    eval_text = EVAL_REPORT.read_text(encoding="utf-8") if EVAL_REPORT.exists() else None
    if eval_text:
        emit("")
        emit("Test set evaluation:")
        for line in eval_text.splitlines():
            if line.startswith("Test accuracy") or line.startswith("Test set size"):
                emit(f"  {line}")

    emit("")
    emit("Per-class F1 scores (from evaluation_report.txt classification report):")
    if eval_text:
        in_table = False
        for line in eval_text.splitlines():
            stripped = line.strip()
            if stripped.startswith("precision"):
                in_table = True
                continue
            if in_table and stripped and not stripped.startswith(("accuracy", "macro avg", "weighted avg")):
                parts = stripped.rsplit(None, 4)
                if len(parts) == 5:
                    class_name, precision, recall, f1, support = parts
                    emit(f"  {class_name:<22} F1={f1}")
            if stripped.startswith("accuracy"):
                break

    emit("")
    emit("Output files:")
    emit(f"  Trained model:      {MODEL_PATH}")
    emit(f"  Training curves:    {CURVES_PNG}")
    emit(f"  Confusion matrix:   {CONFUSION_PNG}")
    emit(f"  Evaluation report:  {EVAL_REPORT}")
    emit(f"  Grad-CAM examples:  {GRADCAM_DIR}")

    emit("")
    emit("Known limitations (for dissertation methodology/limitations discussion):")
    emit("  - Trained on CPU only (no native Windows GPU support for TF >= 2.11), which")
    emit("    limited practical epoch count/dataset size for this project's timeframe.")
    emit("  - Dataset size varies significantly by class - see the per-category training")
    emit("    counts in dataset_summary.txt (one class in particular may have far fewer")
    emit("    real images than the others, which the evaluation report's per-class F1")
    emit("    below will make visible - this is reported honestly, not smoothed over).")
    emit("  - See the confusion matrix (confusion_matrix.png) for which specific style")
    emit("    pairs this model confuses most - visually/culturally similar styles are")
    emit("    expected to show some genuine, irreducible confusion regardless of dataset")
    emit("    size, not purely a model shortcoming.")

    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nSummary saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
