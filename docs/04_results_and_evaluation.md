# 4. Results and Evaluation

All figures in this chapter are taken directly from
`ml-service/models/evaluation_report.txt`, `ml-service/models/model_summary.txt`,
and the generated plots in `ml-service/models/`, produced by running the trained
model once against the held-out test set (179 images, never seen during training or
validation). No numbers in this chapter are projected or estimated.

These are the results of the **6-class generic-aesthetic taxonomy**
(`boho_chic`, `rustic_barn`, `luxury_glamour`, `garden_floral`, `minimalist_modern`,
`traditional_classic` — see Chapter 3, §3.1.1), trained on the 1,181-image cleaned
dataset (§3.1.3). This is this project's ORIGINAL Phase 2 result, restored (not
re-run) from `ml-service/archive_6class_taxonomy/` after a later 5-class Sri
Lankan-market taxonomy experiment was reverted at the project owner's request — see
Chapter 3, §3.1.1. That 5-class experiment's own results (52.07%/54.17% test
accuracy across its two runs, with a complete `sinhala_kandyan` failure) are
preserved for reference in `ml-service/archive_5class_taxonomy/models/` and are not
directly comparable to the figures below, since the two taxonomies used different
classes with different data volumes.

## 4.1 Overall test performance

| Metric | Value |
|---|---|
| Test set size | 179 images |
| **Test accuracy** | **55.31%** |
| Best validation accuracy (epoch 19/20) | 48.88% |
| Best validation loss (epoch 19/20) | 1.3729 |
| Macro-average F1 | 0.5468 |
| Weighted-average F1 | 0.5471 |

A test accuracy of 55.31% on 6 classes is well above the 16.7% random-guess
baseline. Training ran the full fixed 20-epoch budget (10 Phase A + 10 Phase B)
without `EarlyStopping` ever triggering, restoring the checkpoint from epoch 19 —
this indicates training was cut off by the fixed budget rather than having
genuinely plateaued (§3.3). A later experiment with a wider epoch budget and
learning-rate scheduling ("v2", Post-proposal-extension #8) tested this directly
and scored *worse* (53.63% test accuracy), so this original run remains the one
actually deployed — a genuine, reported negative result rather than an assumption
that more training time would have automatically helped.

As is common on a test set this size (179 images), test accuracy (55.31%) came out
noticeably higher than the best validation accuracy (48.88%) — with a per-class
test support of only ~30 images, a handful of favourable predictions shifts the
headline number by several percentage points, so this single-run figure should be
read with that caveat.

## 4.2 Per-class performance

| Style | Precision | Recall | F1-score | Support | Training images |
|---|---|---|---|---|---|
| garden_floral | 0.5581 | 0.8000 | 0.6575 | 30 | 140 |
| traditional_classic | 0.5556 | 0.6667 | 0.6061 | 30 | 140 |
| rustic_barn | 0.7143 | 0.5000 | 0.5882 | 30 | 135 |
| minimalist_modern | 0.5200 | 0.4483 | 0.4815 | 29 | 134 |
| boho_chic | 0.4828 | 0.4667 | 0.4746 | 30 | 138 |
| luxury_glamour | 0.5200 | 0.4333 | 0.4727 | 30 | 137 |

`garden_floral` is the strongest class by recall (80%, i.e. the model rarely misses
a true `garden_floral` image) but only middling on precision (0.56) — it also
absorbs a large share of other classes' misclassifications (§4.3), so it functions
somewhat as the model's "default guess" when uncertain. `rustic_barn` has the
highest precision (0.71, the fewest false positives) but only moderate recall.
`boho_chic` and `luxury_glamour` are the weakest classes (F1 0.47 each) — both are
visually broad, umbrella-like aesthetics (§4.3) that overlap with several of the
other five categories rather than having one or two consistent confusions each.
Class size does not cleanly predict performance here: all six classes have a
similar training-image count (134–140), so the F1 spread (0.47–0.66) reflects
genuine visual/category difficulty rather than a data-volume imbalance, unlike the
5-class taxonomy experiment's `sinhala_kandyan` problem (§3.1.1).

## 4.3 Confusion matrix analysis

See `ml-service/models/confusion_matrix.png`. Reading the matrix directly (rows =
actual class, columns = predicted class; all 6 classes have 29–30 test images):

- **The single largest confusion in the entire matrix is `boho_chic` →
  `traditional_classic`**: 8 of 30 true `boho_chic` images were predicted as
  `traditional_classic` (the reverse is rare: only 0 of 30 true
  `traditional_classic` images were predicted as `boho_chic`), so this is a
  one-directional confusion rather than a symmetric pair — a `boho_chic` photo is
  more likely to be mistaken for `traditional_classic` than the other way around.
- **`luxury_glamour` ↔ `minimalist_modern` is a genuinely mutual confusion**: 6 of
  30 true `luxury_glamour` images were predicted as `minimalist_modern`, and 4 of 29
  true `minimalist_modern` images were predicted as `luxury_glamour` — plausibly
  because both styles can share clean, uncluttered compositions and a restrained
  colour palette, differing mainly in ornamentation (gold/crystal detail vs. bare
  minimalism) that a CNN may under-weight relative to overall scene structure.
- **`garden_floral` is a common "sink" for other classes' errors**: `boho_chic` (6
  of 30), `traditional_classic` (6 of 30), `luxury_glamour` (3 of 30), and
  `minimalist_modern` (3 of 30) all have `garden_floral` as one of their two largest
  off-diagonal cells — consistent with `garden_floral`'s high recall (§4.2): floral
  decor cues are common across weddings generally, so the model appears to lean on
  them as a default whenever a photo doesn't strongly match its true class's more
  specific visual signature.
- `minimalist_modern` → `boho_chic` (6 of 29) is a secondary confusion running the
  opposite direction from the `luxury_glamour` pairing above, suggesting
  `minimalist_modern` is a genuinely difficult "middle" category the model conflates
  with multiple neighbours rather than one specific look-alike.

## 4.4 Grad-CAM interpretation

Three Grad-CAM examples were generated (`ml-service/models/gradcam_examples/`), all
from the `boho_chic` class: one correctly-classified image, one misclassified image
(true `boho_chic`, predicted `traditional_classic`), and one additional random
sample.

- **Correctly-classified example**: a floral/greenery crown against a weathered
  wood-plank background. The heatmap concentrates tightly on the floral crown
  itself (the specific boho-coded prop), largely ignoring the wood-plank
  background — a plausible, human-interpretable basis for the correct prediction.
- **Misclassified example**: a wedding-party group photo (a bride and bridesmaids
  in flowing dresses, holding bouquets, in front of a rustic wooden barn door). The
  heatmap spreads broadly across the group's faces, arms, and bouquets rather than
  concentrating on any one boho-specific cue (e.g. the barn-door background it
  ignores almost entirely) — consistent with §4.3's finding that a formally-posed
  group portrait in flowing pastel dresses can read as visually closer to
  `traditional_classic`'s classic group-photo composition than to `boho_chic`'s more
  typical single-subject/prop-focused imagery, even though the true label is
  `boho_chic`.
- **Random sample (correctly classified)**: a dried-flower and pampas-grass
  arrangement. The heatmap concentrates on the pampas grass texture and the
  surrounding florals — the specific materials most associated with the `boho_chic`
  aesthetic in this dataset — again a plausible, human-interpretable basis for the
  prediction.

Taken together, these three examples support the same conclusion for both correct
and incorrect predictions: the model's attention is generally plausible and
concentrated on genuine style-relevant visual content (florals, props, textures)
rather than spurious background regions; its errors are concentrated in genuinely
ambiguous compositions (a formal group portrait) rather than in the model attending
to nothing meaningful at all.

## 4.5 Summary

The trained EfficientNet-B3 classifier achieves 55.31% test accuracy across the 6
generic-aesthetic wedding-style categories — well above the 16.7% random-guess
baseline for 6 classes, with EarlyStopping never triggering (the run was cut off by
a fixed 20-epoch budget, not genuine convergence — §4.1) and a since-tried wider
budget scoring worse in a documented negative-result experiment. Performance is
strongest for `garden_floral` and `traditional_classic` (F1 0.61–0.66), moderate for
`rustic_barn` (F1 0.59), and weakest for `minimalist_modern`, `boho_chic`, and
`luxury_glamour` (F1 0.47–0.48) — the latter three overlapping each other and
`garden_floral` in a small number of dominant, explainable confusion patterns (§4.3)
rather than failing uniformly at random. Unlike the later 5-class taxonomy
experiment (§3.1.1, `ml-service/archive_5class_taxonomy/`), no class in this
taxonomy suffered a severe data-volume shortfall (all six classes have 134–140
training images), so the accuracy ceiling observed here reflects genuine visual
category ambiguity between generic Western wedding aesthetics rather than a
data-availability problem for any one class. Chapter 5 discusses what this means for
the project's conclusions and future work.
