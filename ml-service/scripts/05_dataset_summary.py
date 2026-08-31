"""
05_dataset_summary.py
----------------------
IN ONE SENTENCE: writes a single text file summarising the dataset's size and
makeup, so anyone can check the numbers without re-running every script.

STEP 7 of Phase 1 (dataset collection) for WeddingLens.

Reads the current state of data/raw, data/cleaned, data/train, data/val,
data/test and writes a single human-readable summary file
(data/dataset_summary.txt) for the dissertation's methodology chapter -
so there's a permanent record of dataset size/composition at the point
Phase 1 was completed, without having to re-run every script to find out.
"""

from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
OUTPUT_FILE = DATA_DIR / "dataset_summary.txt"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def count_images(folder: Path) -> int:
    """Counts image files directly inside a given folder (used for each of
    raw/cleaned/train/val/test, per category)."""
    if not folder.exists():
        return 0
    return sum(1 for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS)


def categories_in(folder: Path):
    """Lists the category subfolder names present under a given stage folder
    (e.g. data/raw) - used to build the full category list even if raw/ and
    cleaned/ don't perfectly agree on which categories exist."""
    if not folder.exists():
        return []
    return sorted(p.name for p in folder.iterdir() if p.is_dir())


def main():
    """Entry point: gathers per-stage, per-category image counts and writes
    them to data/dataset_summary.txt (in addition to printing them), so the
    dissertation has a permanent, reproducible record of dataset size."""
    lines = []

    # Prints a line AND stores it, so the same text ends up both on screen
    # (immediate feedback while running) and in the saved summary file.
    def emit(text=""):
        print(text)
        lines.append(text)

    emit("=" * 70)
    emit("WeddingLens - Dataset Summary (Phase 1 complete)")
    emit("=" * 70)

    all_categories = sorted(set(categories_in(DATA_DIR / "raw")) | set(categories_in(DATA_DIR / "cleaned")))

    raw_counts = {c: count_images(DATA_DIR / "raw" / c) for c in all_categories}
    cleaned_counts = {c: count_images(DATA_DIR / "cleaned" / c) for c in all_categories}
    train_counts = {c: count_images(DATA_DIR / "train" / c) for c in all_categories}
    val_counts = {c: count_images(DATA_DIR / "val" / c) for c in all_categories}
    test_counts = {c: count_images(DATA_DIR / "test" / c) for c in all_categories}

    total_raw = sum(raw_counts.values())
    total_cleaned = sum(cleaned_counts.values())
    removed = total_raw - total_cleaned

    emit("")
    emit(f"Total raw images collected : {total_raw}")
    emit(f"Total after cleaning       : {total_cleaned}")
    emit(f"Removed (corrupt/small/dup): {removed}")
    if total_raw:
        emit(f"Retention rate              : {100 * total_cleaned / total_raw:.1f}%")

    emit("")
    emit("Per-category breakdown:")
    emit(f"{'Category':<22}{'Raw':>7}{'Cleaned':>9}{'Train':>8}{'Val':>6}{'Test':>6}")
    for c in all_categories:
        emit(
            f"{c:<22}{raw_counts[c]:>7}{cleaned_counts[c]:>9}"
            f"{train_counts[c]:>8}{val_counts[c]:>6}{test_counts[c]:>6}"
        )

    emit("")
    emit(f"Final split totals: train={sum(train_counts.values())}  "
         f"val={sum(val_counts.values())}  test={sum(test_counts.values())}")
    emit("")
    emit("Split method: scikit-learn train_test_split, random_state=42, ratios 70/15/15")
    emit("Cleaning method: Pillow validity check, min size 200x200, perceptual-hash")
    emit("                 near-duplicate removal (imagehash.phash, threshold=5)")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nSummary saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
