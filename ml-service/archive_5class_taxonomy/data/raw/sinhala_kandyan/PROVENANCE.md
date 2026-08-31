# sinhala_kandyan — image provenance

Unlike the other categories in this dataset (bulk-downloaded from Unsplash),
every image here was individually opened and visually confirmed as genuine
Kandyan wedding content before being included — Unsplash has no real
coverage for this style (see `../README.md`), so this class is built by hand
from two sources.

## Source 1: this project's own supplied vendor reference photos (32 images)

Copied from `ml-service/notebooks/<Category>/` — the real Sri Lankan vendor
photos the project owner personally supplied for the vendor-listing feature
(see `CLAUDE.md` extension #7). Reused here for a second purpose (style
classifier training) with the project owner's direct approval. Each was
opened and visually confirmed to show genuine Kandyan wedding markers: the
*poruwa*-style osari saree draping, the Nalapata headpiece band, layered
gold/pearl necklaces with pendant medallions, or (for groom photos) the
*Mul Anduma* velvet jacket, *Otunna* hat, and ceremonial sword. Photos that
were generic, Western, or clearly a different South Asian style (e.g. a
North Indian lehenga/maang tikka look) were left out, not included.

| Copied as | Original file | Folder |
|---|---|---|
| sinhala_kandyan_bridalwear_01.jpg | bride 2.jpg | Bridal wear |
| sinhala_kandyan_bridalwear_02.jpg | bride 3.jpg | Bridal wear |
| sinhala_kandyan_bridalwear_03.jpg | bride 4.jpg | Bridal wear |
| sinhala_kandyan_bridalwear_04.jpg | bride 5.jpg | Bridal wear |
| sinhala_kandyan_bridalwear_05.jpg | bride 6.jpg | Bridal wear |
| sinhala_kandyan_bridalwear_06.jpg | bride 9.jpg | Bridal wear |
| sinhala_kandyan_bridalwear_07.jpg | bride 13.jpg | Bridal wear |
| sinhala_kandyan_groomwear_01.jpg | 024d531e0a22eca14df8a53fa1f52c97.jpg | Groom wear |
| sinhala_kandyan_groomwear_02.jpg | 2bcf6ed63eea102d0fc7ccecabda060a.jpg | Groom wear |
| sinhala_kandyan_groomwear_03.jpg | 30ee6ef9cdd2f843467103c48f203bdc.jpg | Groom wear |
| sinhala_kandyan_groomwear_04.jpg | 59a2bc5674d43ad3453898944e5a4636.jpg | Groom wear |
| sinhala_kandyan_groomwear_05.jpg | 7f3ddcea697c01f1bf82665e911ce433.jpg | Groom wear |
| sinhala_kandyan_groomwear_06.jpg | 865ae44e91946fd59563f0ec83d75ea7.jpg | Groom wear |
| sinhala_kandyan_groomwear_07.jpg | 94394a078ec55238e5724f1d245ddc08.jpg | Groom wear |
| sinhala_kandyan_groomwear_08.jpg | b236528761af7e4ea574a74813e0237a.jpg | Groom wear |
| sinhala_kandyan_groomwear_09.jpg | c887c41d00c9baf6a147818df2a27c44.jpg | Groom wear |
| sinhala_kandyan_jewellery_01.jpg | 08e1a851467035e727f87e37dde20ef2.jpg | Jewellery |
| sinhala_kandyan_jewellery_02.jpg | 0a0d673d05725142f1612951a9a9ba8a.jpg | Jewellery |
| sinhala_kandyan_jewellery_03.jpg | 0a447e4715872f813da98e9a7d35ade7.jpg | Jewellery |
| sinhala_kandyan_jewellery_04.jpg | 0ea97bd99d1e1697f5d715c060f89a8b.jpg | Jewellery |
| sinhala_kandyan_jewellery_05.jpg | 13d4db22393f319d366dd0749ebe46a5.jpg | Jewellery |
| sinhala_kandyan_jewellery_06.jpg | 19b24e02e52e79905c09019b7d22e820.jpg | Jewellery |
| sinhala_kandyan_jewellery_07.jpg | 26fb868d3fcc2c9ed3b6970085fd87fb.jpg | Jewellery |
| sinhala_kandyan_jewellery_08.jpg | 31a3d83c0966a442957444b769ac2190.jpg | Jewellery |
| sinhala_kandyan_jewellery_09.jpg | 34355b7fc6175fedfdd3b6e999296361.jpg | Jewellery |
| sinhala_kandyan_jewellery_10.jpg | 3dd662bb0c42f1c998f21aad2a463137.jpg | Jewellery |
| sinhala_kandyan_jewellery_11.jpg | 5c42fb31f7c8799b372a7e816f95df7a.jpg | Jewellery |
| sinhala_kandyan_jewellery_12.jpg | 60fddf433a327d6d64da3b84a16b54c4.jpg | Jewellery |
| sinhala_kandyan_jewellery_13.jpg | 61ede849fb3ade3e4ebb8850b0acbaaa.jpg | Jewellery |
| sinhala_kandyan_jewellery_14.jpg | 873b5f1e6f084666b0233e6d93e2ef33.jpg | Jewellery |
| sinhala_kandyan_jewellery_15.jpg | 9d86677328440e11d129f02f6875052d.jpg | Jewellery |
| sinhala_kandyan_jewellery_16.jpg | c3e6fbaf6048676806308c08c2dc7434.jpg | Jewellery |
| sinhala_kandyan_decor_01.jpg | c8ac37dfbe2050ecac211b18930ea1fb.jpg | Decorations |
| sinhala_kandyan_ceremony_01.jpg | 310d91b6a4279b48324b2f1e398711bd.jpg | photography & videography |
| sinhala_kandyan_ceremony_02.jpg | c22032d3e4440f780d3acb9474b61b22.jpg | photography & videography |
| sinhala_kandyan_ceremony_03.jpg | c23457f389bed3702de0da605457b671.jpg | photography & videography |
| sinhala_kandyan_ceremony_04.jpg | dc6b55d4f452804b71687efc9c40cc52.jpg | photography & videography |

**Second pass (2026-08-31)**: per the project owner's request to also check "weddings,
wedding decors (Sri Lankan)" specifically, the remaining unreviewed notebooks folders
were checked: all of `Decorations/` (16 images) and `photography & videography/` (16
images) were individually opened and visually checked, plus a quick sample of
`Cake artists/`, `caterers/`, `rentals/`, and `wedding planners/` (which turned out to
be generic global stock with no Sri Lankan-specific markers - product/venue shots
don't carry the same cultural signal attire/ceremony photos do). This pass found:
- 1 genuine hit in `Decorations/`: a traditional Sri Lankan ceremonial sweets/paddy/
  lotus table spread (kokis and other traditional treats, a punkalasa-style pot, paddy
  sheaves) - `sinhala_kandyan_decor_01.jpg`.
- 4 genuine hits in `photography & videography/`, all real poruwa ceremony photography
  (raised platform, traditional ceremonial items, Sinhala script decor in one case,
  "Ceylon Wedlock"/"Enamour" real Sri Lankan studio credits) - the
  `sinhala_kandyan_ceremony_0X.jpg` files above. The rest of that folder (11 images)
  was generic Western/Asian couple photography with no Kandyan markers.
- A repeat, broader Unsplash check specifically for wedding **decor** (as opposed to
  attire/bride, checked earlier) - `"sri lankan wedding decoration"`,
  `"poruwa decoration"` (0 results), `"sri lankan wedding stage decor"` - came back
  with the same generic-noise pattern as every earlier attempt (a lake tourism photo,
  a hotel listing, generic North Indian bridal portraits), confirming yet again there
  is no usable Unsplash coverage for this class from any angle tried.

Total after this pass: **37 images** (up from 32).

Note: several of these are professional studio photos carrying the
photographer/studio's own watermark or credit (e.g. Subash Abeywickrama,
Studio Momentzz, Dhananjaya Bandara, Sandun Wijesinghe Photography — several
of whom are real Sri Lankan wedding vendors, some already in this project's
own `backend/db/seed.sql`). They're used here as training input (the model
never reproduces or displays the source image itself, only learns visual
patterns from it), the same basis on which they were already approved for
the public vendor-listing feature.

## Source 2: Unsplash, individually curated (see below)

Any Unsplash-sourced additions are logged the normal way, in
`../attribution_log.csv`, with `source_query` noting this was a
hand-reviewed pass, not a bulk download.
