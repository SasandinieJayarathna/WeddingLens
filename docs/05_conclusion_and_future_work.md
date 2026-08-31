# 5. Conclusion and Future Work

## 5.1 Summary of what was achieved

This project set out to design, build, and evaluate an end-to-end web application
that classifies wedding aesthetic style from a photo, explains that classification
visually, and recommends matching vendors. All five objectives set out in Chapter 1
were completed, against the original 6-class generic-aesthetic taxonomy fixed by the
formal project proposal (a 5-class Sri Lankan-market taxonomy was tried partway
through the project and then reverted back to this original set at the project
owner's request, to stay aligned with the proposal — see Chapter 3, §3.1.1 for the
full rationale and that experiment's own results, preserved at
`ml-service/archive_5class_taxonomy/`):

1. A labelled dataset of 1,181 cleaned images across 6 generic wedding-aesthetic
   style categories (`boho_chic`, `rustic_barn`, `luxury_glamour`, `garden_floral`,
   `minimalist_modern`, `traditional_classic`) was collected via the Unsplash API,
   cleaned, and reproducibly split into training (824), validation (178), and test
   (179) sets, with every class landing within 192–200 cleaned images — no severely
   under-represented class.
2. An EfficientNet-B3 transfer-learning classifier was trained and evaluated,
   achieving **55.31% test accuracy** — well above the 16.7% random-guess baseline
   for 6 classes — with per-class F1 ranging 0.47–0.66 (Chapter 4). A later
   experiment with a wider training budget scored worse (53.63%), a genuine,
   honestly-reported negative result rather than an unverified assumption that more
   training would help.
3. Grad-CAM explainability was implemented and verified to produce heatmaps that
   plausibly correspond to the visual elements driving each prediction, for correct
   and incorrect predictions alike (§4.4).
4. A complete full-stack application (Python ML service, Node.js/Express/PostgreSQL
   backend, React/Vite frontend) was built and connected end-to-end, including a
   real 180-vendor Sri Lankan wedding vendor database (12 categories, 15 vendors
   each), tagged to the current 6-class taxonomy.
5. The complete system was integration-tested against the real trained model — not
   mocked — with results, edge cases, and security considerations documented in
   `docs/testing_checklist.md` and `docs/security_notes.md`.

## 5.2 Limitations

This project's limitations are stated here directly rather than left implicit:

- **Moderate overall accuracy (55.31%).** While well above chance, over 4 in 10 test
  images are still misclassified. This is a direct, honestly-reported consequence of
  genuine visual overlap between several of the six categories (§4.3) combined with
  a comparatively modest, CPU-training-constrained dataset (below), not evidence of
  an implementation defect.
- **CPU-only training.** Native TensorFlow GPU support was unavailable on Windows
  for the TensorFlow version used (≥2.11), so the development machine's NVIDIA
  GeForce MX550 GPU could not be used without additional infrastructure (WSL2 or a
  DirectML plugin) that was out of scope for this project. This constrained the
  practical epoch count and, indirectly, the choice of EfficientNet-B3 over a larger
  variant, within the project's timeframe. It is also the direct cause of
  `EarlyStopping` never triggering (§4.1): the fixed 20-epoch budget was set to keep
  CPU training time practical, not because 20 epochs was known to be sufficient for
  convergence.
- **Dataset scale.** All six classes have 134–140 training images each — modest
  relative to production-scale image classification datasets (typically thousands
  of images per class) — and a plausible contributor to the accuracy ceiling
  observed, though notably the classes are *evenly* sized, so no single class
  suffers the severe data-starvation problem found in the later 5-class taxonomy
  experiment's `sinhala_kandyan` class (§3.1.1).
- **Inherent category ambiguity.** As discussed in §4.3, the dominant confusions
  (`boho_chic`→`traditional_classic`, `luxury_glamour`↔`minimalist_modern`,
  and `garden_floral` acting as a common "sink" for other classes' errors)
  correspond to categories that are genuinely visually related generic Western
  wedding aesthetics rather than sharply distinct ones, meaning some irreducible
  error rate should be expected regardless of dataset size, distinct from error
  that could be fixed by more data or training time.
- **No fixed, published taxonomy for wedding styles.** The six categories used were
  defined by the original project brief as a generic Western wedding-aesthetic
  taxonomy rather than derived from or validated against an existing published
  taxonomy (see Chapter 2's literature gap), so their boundaries are inherently
  somewhat subjective — a genuine contributor to the confusion patterns in §4.3.
- **A taxonomy change was tried and reverted.** Partway through the project the
  taxonomy was temporarily replaced with a 5-class Sri Lankan wedding-market-specific
  set, then reverted back to this original 6-class set at the project owner's
  request to stay aligned with the formal proposal. That reverted experiment is
  itself documented honestly (§3.1.1, `ml-service/archive_5class_taxonomy/`) rather
  than erased, including its own genuine finding that a severely data-starved class
  (`sinhala_kandyan`, ~25–32 training images) can fail completely (0% across every
  metric) even when the rest of a taxonomy performs comparably to this one.
- **Inference architecture.** The backend invokes the Python prediction script as a
  fresh subprocess per request rather than running a persistent inference service,
  which is simple but means every request re-pays the cost of importing TensorFlow
  and loading the model (documented in `docs/security_notes.md`). This is an
  acceptable trade-off for a low-traffic prototype but would not scale to
  significant concurrent usage without revision.
- **Editorial, not vendor-verified, style tagging.** The 180 real Sri Lankan
  vendors in the recommendation database are genuine businesses (sourced via
  public directories and web search — see `backend/db/seed.sql`'s sourcing
  notes), but each vendor's `wedding_style` tag is this project's own editorial
  categorisation for demo/recommendation-matching purposes, not a claim made by
  the business itself about which style category it belongs to.

## 5.3 Future work

- **Scale up the dataset across all six classes.** With every class in the
  134–140 training-image range, collecting substantially more images per category
  (the Unsplash API integration built here already supports incremental top-ups)
  would likely improve accuracy further, particularly for the weakest classes
  (`boho_chic`, `luxury_glamour`, `minimalist_modern`, F1 0.47–0.48).
- **Investigate the `boho_chic`→`traditional_classic` and
  `luxury_glamour`↔`minimalist_modern` confusions specifically.** Given how
  concentrated the errors are around a small number of confusion pairs (§4.3)
  rather than spread uniformly, targeted work — additional training images
  specifically covering the ambiguous middle ground between each pair, or a
  higher-resolution second-stage classifier restricted to just the confused
  pair — could plausibly move accuracy more than generic dataset growth would.
- **GPU-enabled training.** Migrating training to a Linux environment or WSL2 with
  proper CUDA/cuDNN support (or a cloud GPU instance) would remove the CPU
  bottleneck entirely, enabling more epochs, larger batch sizes, and experimentation
  with larger EfficientNet variants (B5–B7) within a practical timeframe — and
  would let `EarlyStopping` be evaluated against a genuinely unconstrained epoch
  budget, rather than the fixed 20-epoch CPU-practical cap used here (§5.2).
- **A persistent inference service.** Replacing the current per-request Python
  subprocess with a small, always-running inference service (e.g. FastAPI or Flask,
  keeping the model loaded in memory) would remove the repeated TensorFlow
  import/model-load cost per request and would be a prerequisite for handling
  meaningful concurrent traffic.
- **Vendor-verified style tagging.** Replacing this project's own editorial
  `wedding_style` tags with vendor-confirmed style specialisations (with vendors'
  consent and input) would make the recommendation feature more trustworthy for
  any real-world deployment.
- **A validated wedding-style taxonomy — and a considered choice between generic
  and market-specific.** Future work could survey real users or wedding industry
  professionals to validate (or further revise) the six style categories, or revisit
  the market-specific direction explored and reverted in this project (§3.1.1) with
  a properly-resourced data-collection effort (e.g. direct partnerships with
  photographers/studios for consented image use, rather than relying on stock-photo
  APIs) so that a market-specific taxonomy would not repeat the severe per-class
  data shortfall that experiment ran into.

## 5.4 Closing remark

The project demonstrates that a complete, working, explainable image-classification
web application can be built end-to-end — from raw image collection through to a
tested, deployed-locally full-stack system — within the constraints of a single
capstone project and consumer hardware, and that its taxonomy could be meaningfully
revised mid-project and then, on reflection, reverted back to stay faithful to the
original proposal, without breaking that system either time. Its accuracy is a
realistic reflection of real constraints (CPU-only training, a moderate dataset
size, and genuine category ambiguity between several visually-related generic
wedding aesthetics) rather than of any single avoidable implementation error, and
this document has aimed to represent that honestly throughout — including reporting
a worse retraining result rather than hiding it (§4.1), and preserving rather than
erasing the taxonomy experiment that was ultimately not kept (§3.1.1).
