"""
01b_collect_dataset_sl_market.py
---------------------------------
IN ONE SENTENCE: downloads wedding photos from Unsplash for the Sri
Lankan-market style categories that DO have real stock photo coverage
(western_white, modern_fusion, indian_influenced).

HISTORICAL NOTE: at the time this script was written, the taxonomy was still
a 6-class work-in-progress that included a since-dropped `muslim_traditional`
category, and this script wrote to a temporary `data/raw_sl_market/` folder
kept separate from the (then still-live) old 6-class `data/raw/` so the
system kept working mid-transition. That transition is now complete:
`muslim_traditional` was dropped (Unsplash coverage for it turned out to be
unreliable - mislabelled Hindu wedding photos, see below), the taxonomy is
now the 5 classes below, `data/raw_sl_market/` was promoted to be the
canonical `data/raw/`, and the old 6-class dataset/model were archived to
`ml-service/archive_6class_taxonomy/` rather than deleted. This script is
kept as-is as a real record of how this part of the dataset was actually
built (see also 01c_collect_dataset_tamil_hindu.py, and
data/raw/sinhala_kandyan/PROVENANCE.md for how that class was hand-curated
instead of Unsplash-collected).

FURTHER UPDATE: this 5-class Sri Lankan-market taxonomy was itself later
reverted, at the project owner's request, back to the original 6-class
generic-aesthetic taxonomy (`01_collect_dataset.py`) to stay aligned with the
formal project proposal. The dataset/model this script produced are now
archived at `ml-service/archive_5class_taxonomy/` rather than deleted -
`ml-service/data/` and `ml-service/models/` are the restored 6-class
originals again. This script is still kept as-is, unmodified, as a real
record of this taxonomy experiment.

Why only 3 of the current 5 categories are collected here (see
CLAUDE.md's Sri Lankan market taxonomy update for the full investigation):
  Unsplash's search was tested directly against candidate queries for every
  candidate category before writing this script. western_white,
  modern_fusion, and indian_influenced all returned thousands of real,
  relevant results on manual inspection. `sinhala_kandyan` and (the
  since-dropped) `muslim_traditional` either returned near-zero results, or
  a deceptively high "total" count that turned out - on actually inspecting
  the photo descriptions and, later, the images themselves, not just
  trusting the number - to be generic "wedding"/"Sri Lanka" keyword noise
  (e.g. "sinhala wedding poruwa" nominally returned 4321 results, but the
  top hits were things like "a man and woman holding an umbrella in a
  field" - not a single genuine Kandyan poruwa ceremony photo). Faking
  coverage that isn't there would misrepresent those cultures, so
  `sinhala_kandyan` was instead built from real, hand-curated photos (see
  PROVENANCE.md above) and `muslim_traditional` was dropped from the
  taxonomy entirely rather than populated with unreliable data.

Setup required: same as 01_collect_dataset.py - UNSPLASH_ACCESS_KEY in
ml-service/.env.
"""

import csv
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR.parent / "data" / "raw"  # promoted from raw_sl_market/ once the taxonomy transition completed
ATTRIBUTION_LOG = RAW_DIR / "attribution_log.csv"

load_dotenv(SCRIPT_DIR.parent / ".env")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")

TARGET_PER_CATEGORY = 200  # matches the density used for the original 6-class dataset
UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"
PER_PAGE = 30  # Unsplash's max per request

# Only the 3 categories confirmed (by direct query + manual inspection of
# results, not just a "total" count) to have real, relevant Unsplash
# coverage. Multiple search phrases per category for enough unique photos.
CATEGORY_SEARCH_TERMS = {
    "western_white": [
        "western wedding",
        "white wedding dress bride",
        "church wedding ceremony",
        "wedding gown bride groom",
    ],
    "modern_fusion": [
        "modern wedding fusion",
        "contemporary wedding reception",
        "modern wedding decor colorful",
    ],
    "indian_influenced": [
        "indian wedding",
        "indian bride wedding",
        "indian wedding mandap",
        "south asian wedding",
    ],
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def count_images(folder: Path) -> int:
    """How many image files are currently in a category's raw folder - used
    to know when a category has hit TARGET_PER_CATEGORY and can be skipped."""
    if not folder.exists():
        return 0
    return sum(1 for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS)


def load_seen_photo_ids() -> set:
    """So re-running this script doesn't re-download photos we already have."""
    if not ATTRIBUTION_LOG.exists():
        return set()
    seen = set()
    with open(ATTRIBUTION_LOG, "r", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            seen.add(row["unsplash_photo_id"])
    return seen


def append_attribution_rows(rows: list):
    """Appends newly downloaded photos' attribution info to
    attribution_log.csv (creating it with a header if it doesn't exist yet)."""
    file_exists = ATTRIBUTION_LOG.exists()
    ATTRIBUTION_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(ATTRIBUTION_LOG, "a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["class", "filename", "photographer", "photographer_url", "source_query", "unsplash_photo_id"]
        )
        if not file_exists:
            writer.writeheader()
        writer.writerows(rows)


def search_unsplash(query: str, page: int) -> list:
    """Runs one Unsplash search query/page and returns the list of photo
    result objects, raising a clear RuntimeError for bad key / rate limit."""
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
    params = {"query": query, "per_page": PER_PAGE, "page": page, "orientation": "landscape"}
    resp = requests.get(UNSPLASH_SEARCH_URL, headers=headers, params=params, timeout=20)

    if resp.status_code == 401:
        raise RuntimeError(
            "Unsplash API returned 401 Unauthorized - check UNSPLASH_ACCESS_KEY in ml-service/.env"
        )
    if resp.status_code == 403:
        raise RuntimeError("Unsplash API rate limit hit (403). Wait an hour, or re-run later - progress so far is saved.")
    resp.raise_for_status()
    return resp.json().get("results", [])


def download_image(url: str, dest_path: Path) -> bool:
    """Downloads one image's bytes to disk; returns False (and prints a
    warning) instead of raising, so one bad download doesn't crash the run."""
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        dest_path.write_bytes(resp.content)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"    ! Failed to download {url}: {exc}")
        return False


def collect_category(category: str, terms: list, seen_ids: set) -> dict:
    """Tops up one category's raw folder up to TARGET_PER_CATEGORY images."""
    category_dir = RAW_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    starting_count = count_images(category_dir)

    if starting_count >= TARGET_PER_CATEGORY:
        print(f"  -> already at/above target ({TARGET_PER_CATEGORY}), skipping")
        return {"start": starting_count, "end": starting_count, "downloaded": 0}

    new_rows = []
    downloaded_this_category = 0

    for term in terms:
        page = 1
        while count_images(category_dir) < TARGET_PER_CATEGORY and page <= 10:
            print(f'  Searching Unsplash: "{term}" (page {page})')
            try:
                results = search_unsplash(term, page)
            except RuntimeError as exc:
                print(f"    ! {exc}")
                break
            if not results:
                print(f"    (no more results for this query)")
                break

            for photo in results:
                if count_images(category_dir) >= TARGET_PER_CATEGORY:
                    break
                photo_id = photo["id"]
                if photo_id in seen_ids:
                    continue

                image_url = photo["urls"]["regular"]
                filename = f"{category}_{photo_id}.jpg"
                dest_path = category_dir / filename

                if download_image(image_url, dest_path):
                    seen_ids.add(photo_id)
                    downloaded_this_category += 1
                    new_rows.append(
                        {
                            "class": category,
                            "filename": filename,
                            "photographer": photo["user"]["name"],
                            "photographer_url": photo["user"]["links"]["html"],
                            "source_query": term,
                            "unsplash_photo_id": photo_id,
                        }
                    )
                time.sleep(0.2)

            page += 1
            time.sleep(1)

    if new_rows:
        append_attribution_rows(new_rows)

    ending_count = count_images(category_dir)
    return {"start": starting_count, "end": ending_count, "downloaded": downloaded_this_category}


def main():
    """Entry point: checks the API key, collects the 3 stock-viable new
    categories, and prints a before/after/new summary table."""
    print("=" * 70)
    print("WeddingLens - SL-market dataset collection (stock-viable categories)")
    print(f"Target: {TARGET_PER_CATEGORY} images per category")
    print("=" * 70)

    if not UNSPLASH_ACCESS_KEY:
        print("\n!! UNSPLASH_ACCESS_KEY not set. Add it to ml-service/.env")
        return

    seen_ids = load_seen_photo_ids()
    print(f"\nAlready have {len(seen_ids)} unique photo IDs logged in this dataset's attribution_log.csv")

    summary = {}
    for category, terms in CATEGORY_SEARCH_TERMS.items():
        print(f"\n[{category}] currently has {count_images(RAW_DIR / category)} images")
        summary[category] = collect_category(category, terms, seen_ids)

    print("\n" + "=" * 70)
    print("COLLECTION SUMMARY")
    print("=" * 70)
    print(f"{'Category':<22}{'Before':>10}{'After':>10}{'New':>10}")
    total_before = total_after = 0
    for category, counts in summary.items():
        print(f"{category:<22}{counts['start']:>10}{counts['end']:>10}{counts['downloaded']:>10}")
        total_before += counts["start"]
        total_after += counts["end"]
    print("-" * 52)
    print(f"{'TOTAL':<22}{total_before:>10}{total_after:>10}{total_after - total_before:>10}")

    under_target = [c for c, v in summary.items() if v["end"] < TARGET_PER_CATEGORY]
    if under_target:
        print(f"\n!! Still under target for: {', '.join(under_target)}")
    else:
        print(f"\nAll 3 stock-viable categories reached the {TARGET_PER_CATEGORY}-image target.")
    print("\nReminder: sinhala_kandyan, tamil_hindu_traditional, and muslim_traditional")
    print("are NOT collected by this script - see data/raw/README.md for what's needed.")


if __name__ == "__main__":
    main()
