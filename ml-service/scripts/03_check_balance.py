"""
03_check_balance.py
--------------------
IN ONE SENTENCE: counts how many photos each style has and warns if one
style has way fewer than the others (which would confuse training).

STEP 5 of Phase 1 (dataset collection) for WeddingLens.

What this script does (in plain English):
  Before we split the data into train/val/test sets, we want to check that
  each of the 6 style categories has roughly the same number of images.
  A model trained on an imbalanced dataset (e.g. 200 garden_floral photos but
  only 30 boho_chic photos) tends to get biased toward predicting
  the bigger classes. This script counts images per category, draws a bar
  chart so it's easy to see at a glance, and flags any category that looks
  too small.

  This script does NOT try to fix imbalance automatically — per the project
  plan, that decision (re-run collection with more search terms, or accept
  the imbalance and note it as a limitation) is left to the developer.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # write to file, no GUI window needed
import matplotlib.pyplot as plt

SCRIPT_DIR = Path(__file__).resolve().parent
CLEANED_DIR = SCRIPT_DIR.parent / "data" / "cleaned"
OUTPUT_CHART = SCRIPT_DIR.parent / "data" / "class_balance.png"

MIN_RECOMMENDED = 120
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def count_images(folder: Path) -> int:
    """Counts image files directly inside one category's cleaned folder."""
    if not folder.exists():
        return 0
    return sum(1 for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS)


def main():
    """Entry point: counts every cleaned category, prints a status table
    flagging any under MIN_RECOMMENDED, and saves a bar chart to
    data/class_balance.png."""
    categories = sorted(p.name for p in CLEANED_DIR.iterdir() if p.is_dir())
    counts = {c: count_images(CLEANED_DIR / c) for c in categories}

    print("=" * 70)
    print("WeddingLens - Class Balance Check (Step 5, Phase 1)")
    print("=" * 70)
    print(f"\n{'Category':<22}{'Count':>8}   Status")
    print("-" * 50)

    flagged = []
    for category, count in counts.items():
        status = "OK"
        if count < MIN_RECOMMENDED:
            status = f"LOW (< {MIN_RECOMMENDED}) - flag for more collection"
            flagged.append(category)
        print(f"{category:<22}{count:>8}   {status}")

    total = sum(counts.values())
    avg = total / len(counts) if counts else 0
    print("-" * 50)
    print(f"{'TOTAL':<22}{total:>8}")
    print(f"Average per category: {avg:.1f}")

    # ---- Bar chart ----
    plt.figure(figsize=(9, 5))
    bars = plt.bar(counts.keys(), counts.values(), color="#c98a9e")
    plt.axhline(MIN_RECOMMENDED, color="red", linestyle="--", linewidth=1,
                label=f"Recommended minimum ({MIN_RECOMMENDED})")
    for bar, category in zip(bars, counts.keys()):
        plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 2,
                  str(counts[category]), ha="center", va="bottom", fontsize=9)
    plt.title("WeddingLens - Cleaned Images per Style Category")
    plt.ylabel("Number of images")
    plt.xticks(rotation=25, ha="right")
    plt.legend()
    plt.tight_layout()
    OUTPUT_CHART.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(OUTPUT_CHART, dpi=150)
    print(f"\nBar chart saved to: {OUTPUT_CHART}")

    if flagged:
        print("\n!! ATTENTION: the following categories are below the recommended minimum")
        print(f"   of {MIN_RECOMMENDED} images and may need more collection before training:")
        for c in flagged:
            print(f"     - {c} ({counts[c]} images)")
        print("   This script has NOT modified anything automatically -- review and decide")
        print("   whether to re-run 01_collect_dataset.py with more search terms, or accept")
        print("   the imbalance (note it as a limitation in the dissertation).")
    else:
        print(f"\nAll categories meet the recommended minimum of {MIN_RECOMMENDED} images.")


if __name__ == "__main__":
    main()
