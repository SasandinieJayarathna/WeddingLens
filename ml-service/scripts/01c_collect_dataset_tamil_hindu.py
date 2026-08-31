"""
01c_collect_dataset_tamil_hindu.py
------------------------------------
IN ONE SENTENCE: downloads real Hindu wedding ceremony photos from Unsplash
for the tamil_hindu_traditional category.

UPDATE: the 5-class Sri Lankan-market taxonomy this script was part of was
later reverted, at the project owner's request, back to the original 6-class
generic-aesthetic taxonomy (see `01_collect_dataset.py`), to stay aligned
with the formal project proposal. `ml-service/data/`/`models/` are the
restored 6-class originals; this script's own dataset/model are archived at
`ml-service/archive_5class_taxonomy/` rather than deleted. Kept as-is,
unmodified, as a real record of this taxonomy experiment.

Why this is its own script (not folded into 01b_collect_dataset_sl_market.py):
  Unlike western_white/modern_fusion/indian_influenced (checked once and
  trusted), tamil_hindu_traditional needed a second, stricter check before
  being approved for bulk download: Unsplash's search is fuzzy/relevance-
  ranked, and a sibling category in this same taxonomy (muslim_traditional)
  looked fine by its query "total" counts and text descriptions but turned
  out - only visible once actual sample images were opened and looked at,
  not just their text - to be ~30% genuinely relevant and ~70% misattributed
  Hindu wedding photos or generic hand/couple shots. So before trusting this
  category, a same-rigor visual sample (not just descriptions) was pulled
  and manually reviewed: 6/6 sampled images across all 3 queries below were
  unambiguous, real Hindu wedding ceremony content (betel-leaf/coconut hand
  ritual, garland exchange, the saptapadi sacred-fire ritual, a decorated
  wedding mandap) - a much higher and consistent hit rate, so this category
  was approved for the same bulk-download treatment as the original 3.

Honesty note for the dissertation: these are genuine Hindu wedding ceremony
photos (thali/garland/fire-ritual content), which IS the same core religious
tradition Sri Lankan Tamil Hindu weddings follow - but the photos themselves
are not verified as taken in Sri Lanka specifically (Unsplash's own search
has no reliable way to filter by country of origin). Framed honestly as
"Tamil Hindu wedding style" content, not "verified Sri Lankan Tamil".

Setup required: same as 01_collect_dataset.py - UNSPLASH_ACCESS_KEY in
ml-service/.env.
"""

import csv
import time
from pathlib import Path
import os

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR.parent / "data" / "raw"  # promoted from raw_sl_market/ once the taxonomy transition completed
ATTRIBUTION_LOG = RAW_DIR / "attribution_log.csv"

load_dotenv(SCRIPT_DIR.parent / ".env")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")

TARGET = 200
CATEGORY = "tamil_hindu_traditional"
SEARCH_TERMS = ["tamil hindu wedding", "south indian hindu wedding", "hindu wedding ceremony"]
UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"
PER_PAGE = 30
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def count_images(folder: Path) -> int:
    """Counts image files already downloaded for this category."""
    if not folder.exists():
        return 0
    return sum(1 for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS)


def load_seen_photo_ids() -> set:
    """Loads photo IDs already logged, so re-runs/other categories in the
    same attribution_log.csv don't get re-downloaded or double-counted."""
    if not ATTRIBUTION_LOG.exists():
        return set()
    seen = set()
    with open(ATTRIBUTION_LOG, "r", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            seen.add(row["unsplash_photo_id"])
    return seen


def append_attribution_rows(rows: list):
    """Appends this run's newly downloaded photos to the shared
    attribution_log.csv (creating it with a header if needed)."""
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
    """One Unsplash search request; raises a clear error for bad key/rate limit."""
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
    params = {"query": query, "per_page": PER_PAGE, "page": page, "orientation": "landscape"}
    resp = requests.get(UNSPLASH_SEARCH_URL, headers=headers, params=params, timeout=20)
    if resp.status_code == 401:
        raise RuntimeError("Unsplash API returned 401 Unauthorized - check UNSPLASH_ACCESS_KEY")
    if resp.status_code == 403:
        raise RuntimeError("Unsplash API rate limit hit (403). Wait an hour and re-run.")
    resp.raise_for_status()
    return resp.json().get("results", [])


def download_image(url: str, dest_path: Path) -> bool:
    """Downloads one image; returns False on failure instead of crashing the run."""
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        dest_path.write_bytes(resp.content)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"    ! Failed to download {url}: {exc}")
        return False


def main():
    """Entry point: tops up tamil_hindu_traditional to TARGET images."""
    print("=" * 70)
    print(f"WeddingLens - collecting '{CATEGORY}' (Tamil/South Indian Hindu wedding stock)")
    print("=" * 70)

    if not UNSPLASH_ACCESS_KEY:
        print("!! UNSPLASH_ACCESS_KEY not set in ml-service/.env")
        return

    seen_ids = load_seen_photo_ids()
    category_dir = RAW_DIR / CATEGORY
    category_dir.mkdir(parents=True, exist_ok=True)
    starting_count = count_images(category_dir)
    print(f"Currently has {starting_count} images. Target: {TARGET}.")

    new_rows = []
    for term in SEARCH_TERMS:
        page = 1
        while count_images(category_dir) < TARGET and page <= 10:
            print(f'  Searching Unsplash: "{term}" (page {page})')
            try:
                results = search_unsplash(term, page)
            except RuntimeError as exc:
                print(f"    ! {exc}")
                break
            if not results:
                break
            for photo in results:
                if count_images(category_dir) >= TARGET:
                    break
                photo_id = photo["id"]
                if photo_id in seen_ids:
                    continue
                image_url = photo["urls"]["regular"]
                filename = f"{CATEGORY}_{photo_id}.jpg"
                dest_path = category_dir / filename
                if download_image(image_url, dest_path):
                    seen_ids.add(photo_id)
                    new_rows.append(
                        {
                            "class": CATEGORY,
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
    print(f"\nDone. {starting_count} -> {ending_count} images ({ending_count - starting_count} new).")
    if ending_count < TARGET:
        print(f"!! Still under target ({TARGET}). Re-run later, or top up manually.")


if __name__ == "__main__":
    main()
