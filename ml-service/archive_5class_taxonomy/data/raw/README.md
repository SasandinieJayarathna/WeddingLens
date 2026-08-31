# Sri Lankan-market dataset — status

This folder is the **new** training dataset for WeddingLens's updated, Sri
Lankan wedding-market style taxonomy (replacing the original generic-
aesthetic 6 classes — see `CLAUDE.md`'s Sri Lankan market taxonomy update for
the full story). It's kept separate from `ml-service/data/raw/` (the old
dataset) so the live site keeps working on the old model while this new one
is built.

**Final taxonomy: 5 classes** (`muslim_traditional` was dropped per the
project owner's decision after the stock-sourcing investigation below showed
it couldn't be built reliably without more supplied photos than were
available at the time).

## Status

| Category | Count | Source |
|---|---|---|
| `western_white` | 200/200 ✅ | Unsplash, bulk-collected (real coverage, confirmed) |
| `modern_fusion` | 200/200 ✅ | Unsplash, bulk-collected (real coverage, confirmed) |
| `indian_influenced` | 200/200 ✅ | Unsplash, bulk-collected (real coverage, confirmed) |
| `tamil_hindu_traditional` | 200/200 ✅ | Unsplash, bulk-collected (visually verified, see below) |
| `sinhala_kandyan` | 32/200 ⚠️ | Curated by hand — see below. **This is the practical ceiling without more supplied photos.** |

### How each category was actually built

Every category here was checked the same way before being trusted: run real
queries, then actually **open a sample of the resulting images and look at
them** — not just trust Unsplash's "total" count or the text description,
both of which turned out to be misleading on their own.

- **`western_white` / `modern_fusion` / `indian_influenced`**: thousands of
  results, consistently on-topic on inspection. Bulk-collected, no issues.
- **`tamil_hindu_traditional`**: also bulk-collected. A visual sample (6
  images across 3 queries: `"tamil hindu wedding"`, `"south indian hindu
  wedding"`, `"hindu wedding ceremony"`) came back 6/6 genuine — betel-leaf/
  coconut hand rituals, garland exchange, the sacred-fire (saptapadi) ritual,
  a decorated wedding mandap. This is real Hindu wedding ceremony content,
  which is the same core religious tradition Sri Lankan Tamil Hindu weddings
  follow — but **not verified as photographed in Sri Lanka specifically**
  (Unsplash has no reliable way to filter by that), so this class is framed
  honestly as "Tamil Hindu wedding style", not "verified Sri Lankan Tamil".
- **`sinhala_kandyan`**: **no Unsplash coverage exists, confirmed from every
  angle tried.** Direct queries (`"kandyan wedding"` → 1 result) and a
  visually-reviewed curated pass across 4 more queries (`"sri lankan
  traditional wedding"`, `"kandyan bridal jewellery"`, `"poruwa ceremony"`,
  `"sri lankan bride"` — 57 candidate images actually opened and looked at,
  not just counted) came back with **zero** genuine Kandyan wedding photos —
  just generic Sri Lanka tourism content (a Kandy Esala Perahera drummer
  parade, the Temple of the Tooth, Dambulla temple statues, someone waving
  the national flag) and unrelated portrait/fashion shoots incidentally
  tagged "Sri Lankan". Built instead from **this project's own supplied
  vendor reference photos** (`ml-service/notebooks/Bridal wear/`, `Groom
  wear/`, `Jewellery/` — the real photos already used for the vendor-listing
  feature, see `CLAUDE.md` extension #7): every one of ~50 candidate photos
  across those 3 folders was individually opened and visually checked, and
  32 showed genuine Kandyan markers (osari draping, the Nalapata headpiece,
  layered gold/pearl necklaces, or — for groom photos — the *Mul Anduma*
  velvet jacket, *Otunna* hat, and ceremonial sword). Full per-image
  provenance is in `sinhala_kandyan/PROVENANCE.md`.
- **`muslim_traditional`** *(dropped from the taxonomy)*: was tried and
  rejected as an Unsplash-stock category before being dropped entirely.
  Query text/counts looked usable (`"muslim wedding"` → 3734 total), but a
  visual sample of 7 images across `"islamic wedding ceremony"` / `"nikah
  ceremony"` / `"muslim wedding"` came back only ~2/7 genuinely relevant —
  the rest were clearly Hindu wedding photos mislabeled under those queries,
  or too generic to tell. A keyword-based text filter was tried first and
  barely helped (444/450 "passed" — most photos have no useful description
  at all, genuine or not). Bulk-downloading this would have quietly polluted
  the class with mislabeled Hindu wedding photos, so it was left for the
  project owner to supply real photos for — who then chose to drop the
  category rather than source more photos.

## `sinhala_kandyan` — still short of target

32 real, individually-verified images is a solid, honest set, but well
short of the ~200/category the other 4 classes have (200/category → 1181
cleaned images total in the original dataset, 55.31% test accuracy). Two
ways forward:

1. **Retrain now with what exists.** The training pipeline already uses
   data augmentation (flips, rotation, zoom, brightness) to stretch a
   smaller set, but with 32 images expect this class to noticeably
   underperform the other 4 (which have 200 each) — I'll report that
   honestly in the evaluation, not hide it.
2. **Supply more real photos first**, the same way the 32 were sourced —
   your own/friends' wedding photos, or a Sri Lankan wedding
   photographer/studio's permission to use a few portfolio images. Drop
   them straight into `ml-service/data/raw_sl_market/sinhala_kandyan/`
   (any filename/format works, the cleaning step renames everything).
   Realistic minimum to meaningfully help: ~80-100.

## Once you decide

Tell me which of the two above you want, and I'll run the
cleaning/balance-check/split pipeline (adapted `02`–`04` scripts) over all 5
new categories, retrain the model, evaluate it honestly against the real
test set, and — only once that's a real trained/evaluated model — do the
full cutover: backend/DB/frontend category references,
`vendors.wedding_style` re-tagging, style dashboard content, and every
doc/README/dissertation chapter that currently describes the old 6-class
system.
