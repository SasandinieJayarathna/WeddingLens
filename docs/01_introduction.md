# 1. Introduction

## 1.1 Background

Planning a wedding involves coordinating a large number of independent decisions —
venue, photography, floral design, catering, and more — that are expected to cohere
into a single, recognisable visual style (for example, "boho chic" or "rustic barn").
Couples typically begin this process by collecting inspiration images from social
media and wedding-planning platforms, but translating a folder of liked photos into
a concrete style label, and from that label into a shortlist of vendors who work in
that style, remains a manual and time-consuming task. Vendor-discovery platforms
generally rely on keyword search or manually assigned tags rather than analysing the
visual content of a couple's own inspiration images directly.

Advances in convolutional neural networks (CNNs) and transfer learning have made it
practical to build image classifiers for narrow, domain-specific visual categories
without training a network from scratch on millions of labelled examples. At the
same time, growing awareness of the "black box" nature of deep learning models has
driven interest in explainability techniques — methods that reveal *why* a model
reached a particular decision, rather than only *what* the decision was — which is
particularly relevant in a consumer-facing tool where a user has no ML background
and needs to trust or sanity-check an automated prediction.

## 1.2 Problem statement

There is no widely available tool that takes a single wedding inspiration photo,
classifies its aesthetic style automatically, explains that classification visually,
and connects the result to relevant vendors in one workflow. Couples are left to
perform style classification themselves (subjectively, and often inconsistently)
and then separately search for vendors under whatever the platform's own style
taxonomy happens to be.

## 1.3 Research gap

Style classification has been studied extensively in the general fashion/clothing
domain (see Chapter 2), but the wedding-specific domain — where "style" is expressed
through a combination of venue architecture, floral choices, colour palette, and
decor rather than garment attributes alone — is comparatively under-explored in the
published literature available to this project. Combining such a classifier with
Grad-CAM-based explainability and a direct vendor-recommendation step, in a single
end-to-end web application, is the specific gap this project addresses.

## 1.4 Aim

To design, build, and evaluate an end-to-end web application that classifies the
aesthetic style of a wedding from a single user-uploaded photo, explains that
classification visually, and recommends matching vendors accordingly.

## 1.5 Objectives

1. Collect and prepare a labelled image dataset covering six wedding aesthetic
   style categories (boho_chic, rustic_barn, luxury_glamour, garden_floral,
   minimalist_modern, traditional_classic).
2. Train and evaluate a convolutional neural network classifier for these six
   categories using transfer learning (EfficientNet-B3), and quantify its
   performance on a held-out test set.
3. Implement Grad-CAM explainability so that each prediction is accompanied by a
   visual indication of which image regions influenced it.
4. Build a full-stack web application (Node.js/Express backend, PostgreSQL
   database, React frontend) that exposes the trained model and a vendor
   database to an end user through a simple upload-and-browse workflow.
5. Integration-test the complete system end-to-end and document its behaviour,
   limitations, and security considerations honestly.

## 1.6 Scope

The scope of this project is a working prototype and its evaluation, not a
production-ready commercial product. Specific boundaries:

- The vendor database is populated with clearly marked sample/demonstration data
  (see `backend/db/seed.sql`), not real vendor partnerships.
- The model was trained on CPU only, due to the unavailability of native
  TensorFlow GPU support on the development machine's OS/TensorFlow version
  combination (see Chapter 3 and Chapter 5 for the implications of this).
- The six style categories are fixed by design and were chosen prior to dataset
  collection (per the original project proposal), rather than derived
  empirically from a larger, unlabelled corpus. Partway through the project
  this taxonomy was temporarily replaced with a 5-class Sri Lankan
  wedding-market-specific set (sinhala_kandyan, tamil_hindu_traditional,
  western_white, modern_fusion, indian_influenced); that experiment was
  reverted back to the original six categories at the project owner's
  request, to stay aligned with the formal proposal (see Chapter 3, §3.1.1
  for the full rationale of both the revision and the revert, and
  `ml-service/archive_5class_taxonomy/` for the superseded taxonomy's own
  dataset/model, preserved for reference).

## 1.7 Dissertation structure

Chapter 2 reviews relevant prior work in wedding/fashion style classification and
explainable AI in computer vision. Chapter 3 describes the dataset collection,
cleaning, model architecture, training procedure, and system architecture in
detail. Chapter 4 presents the actual evaluation results — test accuracy,
per-class metrics, confusion matrix analysis, and Grad-CAM interpretation.
Chapter 5 concludes with a summary of what was achieved, an honest discussion of
limitations, and directions for future work.
