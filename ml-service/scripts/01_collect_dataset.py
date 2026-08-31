"""
01_collect_dataset.py
----------------------
IN ONE SENTENCE: downloads wedding photos from the internet (Unsplash) to
build a training dataset, sorted into folders by style.

STEP 3 of Phase 1 (dataset collection) for WeddingLens.

TAXONOMY NOTE: this script collects the CURRENT 6-class generic-aesthetic
taxonomy (boho_chic, rustic_barn, luxury_glamour, garden_floral,
minimalist_modern, traditional_classic), per the original project proposal.
A later Sri Lankan-market-specific taxonomy (5 classes: sinhala_kandyan,
tamil_hindu_traditional, western_white, modern_fusion, indian_influenced) was
tried and then reverted back to this original 6-class set at the project
owner's request, to stay aligned with the formal proposal document - see
ml-service/scripts/01b_collect_dataset_sl_market.py and
01c_collect_dataset_tamil_hindu.py for the scripts that built that superseded
taxonomy's dataset, and ml-service/archive_5class_taxonomy/ for the
dataset/model it produced (kept for reference, not deleted).

What this script does (in plain English):
  We need photos of weddings in 6 different "styles" (boho_chic, rustic_barn,
  etc.) so we can later train a model to recognise them. This script searches
  the Unsplash API for a couple of search phrases per style and downloads the
  results into ml-service/data/raw/<category>/.

Why the Unsplash API (and not scraping Google/Bing Images)?
  This script originally tried scraping Google Images via the `icrawler`
  package (per the original project plan). In practice that broke: Google's
  page structure has changed since icrawler's parser was written, so every
  request crashed with `TypeError: 'NoneType' object is not iterable`.
  Bing scraping was tried as a fallback and technically didn't crash, but
  returned completely unrelated images (random news photos, wallpapers) -
  almost certainly bot-detection serving fallback content instead of real
  search results. Both are fragile because they depend on reverse-engineering
  a webpage that can change at any time.

  The Unsplash API is the official, structured way to search their photo
  library: a stable JSON response, and crucially the images are free to use
  (Unsplash License) which matters for a dissertation dataset. This project's
  raw folder already had 368 images collected this way before this script was
  (re)written (see data/raw/attribution_log.csv), so this is also just
  matching what was already working.

Setup required:
  1. Get a free Unsplash API key: unsplash.com/developers -> "New Application"
     -> copy the "Access Key" (not the Secret key).
  2. Put it in ml-service/.env as: UNSPLASH_ACCESS_KEY=your_key_here
     (ml-service/.env is gitignored - never commit real API keys)

Rate limits: Unsplash's free "Demo" tier allows 50 API requests/hour. Each
search request can return up to 30 photos, so this is easily enough to top
up all 6 categories in one run. Downloading the actual image bytes (from
Unsplash's CDN, not the API) does NOT count against that limit.

Attribution: Unsplash's terms ask that downloaded photos be attributed to
their photographer. We keep a running data/raw/attribution_log.csv with
photographer name/profile link and the Unsplash photo ID for every image,
appending to whatever was already logged rather than overwriting it.
"""

import csv
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR.parent / "data" / "raw"
ATTRIBUTION_LOG = RAW_DIR / "attribution_log.csv"

load_dotenv(SCRIPT_DIR.parent / ".env")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")

TARGET_PER_CATEGORY = 200
UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"
PER_PAGE = 30  # Unsplash's max per request

# category -> list of search phrases to pull from Unsplash
CATEGORY_SEARCH_TERMS = {
    "boho_chic": ["boho wedding", "bohemian wedding decor"],
    "rustic_barn": ["rustic barn wedding", "rustic wedding decor"],
    "luxury_glamour": ["luxury wedding", "glam wedding decor"],
    "garden_floral": ["garden wedding", "botanical wedding flowers"],
    "minimalist_modern": ["minimalist wedding", "modern wedding decor"],
    "traditional_classic": ["traditional wedding", "classic wedding decor"],
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def count_images(folder: Path) -> int:
    """How many image files are currently in a category's raw folder - used
    to know when a category has hit TARGET_PER_CATEGORY and can be skipped."""
    if not folder.exists():
        return 0
    return sum(1 for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS)


def load_seen_photo_ids() -> set:
    """So re-running this script doesn't re-download photos we already have
    (whether from a previous run of this script, or the original manual
    collection pass that built attribution_log.csv)."""
    if not ATTRIBUTION_LOG.exists():
        return set()
    seen = set()
    with open(ATTRIBUTION_LOG, "r", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            seen.add(row["unsplash_photo_id"])
    return seen


def append_attribution_rows(rows: list):
    """Appends newly downloaded photos' attribution info to
    attribution_log.csv (creating it with a header if it doesn't exist yet),
    without touching rows already logged from previous runs."""
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
    result objects (each with an id, download URL, and photographer info),
    raising a clear RuntimeError for the two failure modes worth explaining
    to the user (bad API key, rate limit hit)."""
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
    warning) instead of raising, so one bad download doesn't crash the whole
    collection run."""
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        dest_path.write_bytes(resp.content)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"    ! Failed to download {url}: {exc}")
        return False


def collect_category(category: str, terms: list, seen_ids: set) -> dict:
    """Tops up one category's raw folder up to TARGET_PER_CATEGORY images,
    searching each of its search terms page by page and skipping any photo
    id already in `seen_ids`. Returns before/after/downloaded counts for the
    summary table printed at the end."""
    category_dir = RAW_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    starting_count = count_images(category_dir)

    if starting_count >= TARGET_PER_CATEGORY:
        print(f"  -> already at/above target ({TARGET_PER_CATEGORY}), skipping")
        return {"start": starting_count, "end": starting_count, "downloaded": 0}

    needed = TARGET_PER_CATEGORY - starting_count
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
                    continue  # already have this exact photo

                image_url = photo["urls"]["regular"]  # ~1080px wide, good balance of quality/size
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
                time.sleep(0.2)  # be polite to Unsplash's CDN

            page += 1
            time.sleep(1)  # be polite between API pages

    if new_rows:
        append_attribution_rows(new_rows)

    ending_count = count_images(category_dir)
    return {"start": starting_count, "end": ending_count, "downloaded": downloaded_this_category}


def main():
    """Entry point: checks the API key is configured, then collects/tops up
    every category in turn and prints a before/after/new summary table."""
    print("=" * 70)
    print("WeddingLens - Dataset Collection via Unsplash API (Step 3, Phase 1)")
    print(f"Target: {TARGET_PER_CATEGORY} images per category (topping up existing images)")
    print("=" * 70)

    if not UNSPLASH_ACCESS_KEY:
        print("\n!! UNSPLASH_ACCESS_KEY not set. Add it to ml-service/.env as:")
        print("     UNSPLASH_ACCESS_KEY=your_key_here")
        print("   Get a free key at https://unsplash.com/developers")
        return

    seen_ids = load_seen_photo_ids()
    print(f"\nAlready have {len(seen_ids)} unique photo IDs logged in attribution_log.csv")

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
        print(f"\n!! Still under target ({TARGET_PER_CATEGORY}) for: {', '.join(under_target)}")
        print("   This can happen if Unsplash's search doesn't have enough unique matching photos,")
        print("   or the hourly rate limit (50 requests/hour) was hit. Re-run this script later -")
        print("   it only tops up, it will not re-download what's already there.")
    else:
        print(f"\nAll categories reached the {TARGET_PER_CATEGORY}-image target.")


if __name__ == "__main__":
    main()
