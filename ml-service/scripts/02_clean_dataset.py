"""
02_clean_dataset.py
--------------------
IN ONE SENTENCE: throws out broken/tiny/duplicate photos and renames the
good ones neatly, so the dataset is clean before training.

STEP 4 of Phase 1 (dataset collection) for WeddingLens.

What this script does (in plain English):
  The raw images we downloaded/collected are messy: some files are corrupt
  (failed downloads), some are too small to be useful, and some are
  near-duplicates of each other (the same photo re-uploaded to different
  sites). This script cleans all of that up and writes tidy, consistently
  named JPEG files into ml-service/data/cleaned/<category>/.

  Steps per category folder:
    1. Try to open every image with Pillow. If it can't be opened, it's
       corrupt -> skip it.
    2. Skip anything smaller than 200x200 pixels (too low-res to be useful
       for training a 300x300 EfficientNet-B3 model).
    3. Use "perceptual hashing" (imagehash) to find near-duplicate images.
       Perceptual hashing turns each image into a short fingerprint that
       stays similar even if the image was resized/recompressed, so two
       near-identical photos get near-identical hashes. We keep the first
       copy we see of each hash and drop the rest.
    4. Convert everything to RGB (some images are grayscale/CMYK/RGBA) and
       save as JPEG, renamed sequentially: boho_chic_001.jpg, boho_chic_002.jpg, ...
"""

from pathlib import Path

import imagehash
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR.parent / "data" / "raw"
CLEANED_DIR = SCRIPT_DIR.parent / "data" / "cleaned"

MIN_WIDTH = 200
MIN_HEIGHT = 200
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}

# Hamming-distance threshold below which two perceptual hashes are treated
# as "the same photo". 0 = identical hash; small values (<=5) still catch
# near-duplicates (recompressed/resized copies) without merging genuinely
# different photos.
DUPLICATE_HASH_THRESHOLD = 5


def clean_category(category: str) -> dict:
    """Runs the 4-step clean (open-check, size-check, dedupe, convert+rename)
    over one category's raw folder, writing survivors into its cleaned
    folder. Returns before/after/corrupt/too_small/duplicate counts for the
    summary table."""
    raw_folder = RAW_DIR / category
    cleaned_folder = CLEANED_DIR / category
    cleaned_folder.mkdir(parents=True, exist_ok=True)

    if not raw_folder.exists():
        print(f"  ! No raw folder found for {category}, skipping")
        return {"before": 0, "after": 0, "corrupt": 0, "too_small": 0, "duplicate": 0}

    source_files = sorted(
        f for f in raw_folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    )
    before_count = len(source_files)

    seen_hashes = []  # list of imagehash objects we've already kept
    corrupt = 0
    too_small = 0
    duplicate = 0
    kept = 0

    for src_file in source_files:
        # 1. Try to open the image (catches corrupt/truncated downloads)
        try:
            img = Image.open(src_file)
            img.verify()  # cheap structural check
            img = Image.open(src_file)  # re-open: verify() consumes the file handle
        except Exception:
            corrupt += 1
            continue

        # 2. Size check
        width, height = img.size
        if width < MIN_WIDTH or height < MIN_HEIGHT:
            too_small += 1
            continue

        # 3. Near-duplicate check via perceptual hash
        try:
            img_hash = imagehash.phash(img)
        except Exception:
            corrupt += 1
            continue

        is_duplicate = any((img_hash - seen) <= DUPLICATE_HASH_THRESHOLD for seen in seen_hashes)
        if is_duplicate:
            duplicate += 1
            continue
        seen_hashes.append(img_hash)

        # 4. Convert to RGB JPEG and save with a sequential name
        kept += 1
        rgb_img = img.convert("RGB")
        out_name = f"{category}_{kept:03d}.jpg"
        rgb_img.save(cleaned_folder / out_name, "JPEG", quality=90)

    return {
        "before": before_count,
        "after": kept,
        "corrupt": corrupt,
        "too_small": too_small,
        "duplicate": duplicate,
    }


def main():
    """Entry point: cleans every category found under data/raw/ and prints a
    before/after/rejection-reason summary table."""
    categories = sorted(p.name for p in RAW_DIR.iterdir() if p.is_dir())

    print("=" * 70)
    print("WeddingLens - Dataset Cleaning (Step 4, Phase 1)")
    print("=" * 70)

    results = {}
    for category in categories:
        print(f"\n[{category}] cleaning...")
        stats = clean_category(category)
        results[category] = stats
        print(
            f"  before={stats['before']}  after={stats['after']}  "
            f"corrupt_removed={stats['corrupt']}  too_small_removed={stats['too_small']}  "
            f"duplicates_removed={stats['duplicate']}"
        )

    print("\n" + "=" * 70)
    print("CLEANING SUMMARY")
    print("=" * 70)
    print(f"{'Category':<22}{'Before':>9}{'After':>9}{'Corrupt':>10}{'TooSmall':>10}{'Dupes':>8}")
    total_before = total_after = total_corrupt = total_small = total_dup = 0
    for category, stats in results.items():
        print(
            f"{category:<22}{stats['before']:>9}{stats['after']:>9}"
            f"{stats['corrupt']:>10}{stats['too_small']:>10}{stats['duplicate']:>8}"
        )
        total_before += stats["before"]
        total_after += stats["after"]
        total_corrupt += stats["corrupt"]
        total_small += stats["too_small"]
        total_dup += stats["duplicate"]
    print("-" * 68)
    print(
        f"{'TOTAL':<22}{total_before:>9}{total_after:>9}"
        f"{total_corrupt:>10}{total_small:>10}{total_dup:>8}"
    )
    print(f"\nCleaned images saved to: {CLEANED_DIR}")


if __name__ == "__main__":
    main()
