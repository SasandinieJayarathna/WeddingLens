"""
04_split_dataset.py
--------------------
IN ONE SENTENCE: divides the cleaned photos into 3 piles - one to teach the
model, one to check its progress, and one to test it honestly at the end.

STEP 6 of Phase 1 (dataset collection) for WeddingLens.

What this script does (in plain English):
  Splits the cleaned images into three sets:
    - train (70%) - what the model actually learns from
    - val   (15%) - used during training to check progress / avoid overfitting
    - test  (15%) - held out completely, only used once at the end to report
                    the final, honest accuracy

  We use scikit-learn's train_test_split with a FIXED random_state=42. This
  matters for the dissertation's methodology section: with a fixed seed,
  re-running this script always produces the exact same split, so the whole
  experiment is reproducible.

  Files are COPIED (not moved) from data/cleaned/ into data/train|val|test/,
  so data/cleaned/ remains untouched as the canonical cleaned dataset.
"""

import shutil
from pathlib import Path

from sklearn.model_selection import train_test_split

SCRIPT_DIR = Path(__file__).resolve().parent
CLEANED_DIR = SCRIPT_DIR.parent / "data" / "cleaned"
DATA_DIR = SCRIPT_DIR.parent / "data"

RANDOM_STATE = 42
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15  # kept explicit for readability even though it's implied

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def split_category(category: str) -> dict:
    """Splits one category's cleaned images into train/val/test (70/15/15,
    fixed random_state so the split is reproducible) and copies each subset
    into data/<split>/<category>/, clearing any stale files from a previous
    run first. Returns the resulting counts per split."""
    src_folder = CLEANED_DIR / category
    files = sorted(
        f for f in src_folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    )

    # First split off the training set, then split the remainder into val/test.
    train_files, remainder = train_test_split(
        files, train_size=TRAIN_RATIO, random_state=RANDOM_STATE
    )
    # remainder is 30% of the data; we want val=15% and test=15% overall,
    # which is a 50/50 split of the remainder.
    val_files, test_files = train_test_split(
        remainder, train_size=0.5, random_state=RANDOM_STATE
    )

    for split_name, split_files in [("train", train_files), ("val", val_files), ("test", test_files)]:
        dest_folder = DATA_DIR / split_name / category
        dest_folder.mkdir(parents=True, exist_ok=True)
        # clear out any previous split contents for this category so re-running
        # this script doesn't leave stale files behind
        for old_file in dest_folder.iterdir():
            if old_file.is_file():
                old_file.unlink()
        for f in split_files:
            shutil.copy2(f, dest_folder / f.name)

    return {"train": len(train_files), "val": len(val_files), "test": len(test_files)}


def main():
    """Entry point: splits every cleaned category and prints a per-category
    and grand-total train/val/test count table."""
    categories = sorted(p.name for p in CLEANED_DIR.iterdir() if p.is_dir())

    print("=" * 70)
    print("WeddingLens - Train/Val/Test Split (Step 6, Phase 1)")
    print(f"Ratios: train={TRAIN_RATIO:.0%}  val={VAL_RATIO:.0%}  test={TEST_RATIO:.0%}"
          f"  (random_state={RANDOM_STATE})")
    print("=" * 70)

    results = {}
    for category in categories:
        counts = split_category(category)
        results[category] = counts
        print(f"[{category}] train={counts['train']}  val={counts['val']}  test={counts['test']}")

    print("\n" + "=" * 70)
    print("SPLIT SUMMARY")
    print("=" * 70)
    print(f"{'Category':<22}{'Train':>8}{'Val':>8}{'Test':>8}{'Total':>8}")
    total_train = total_val = total_test = 0
    for category, counts in results.items():
        row_total = counts["train"] + counts["val"] + counts["test"]
        print(f"{category:<22}{counts['train']:>8}{counts['val']:>8}{counts['test']:>8}{row_total:>8}")
        total_train += counts["train"]
        total_val += counts["val"]
        total_test += counts["test"]
    grand_total = total_train + total_val + total_test
    print("-" * 54)
    print(f"{'TOTAL':<22}{total_train:>8}{total_val:>8}{total_test:>8}{grand_total:>8}")
    print(f"\nSplit files written to: {DATA_DIR / 'train'}, {DATA_DIR / 'val'}, {DATA_DIR / 'test'}")


if __name__ == "__main__":
    main()
