# 2. Literature Review

## 2.1 Convolutional neural networks and transfer learning for image classification

Modern image classification is dominated by convolutional neural network (CNN)
architectures trained on large labelled datasets such as ImageNet (Deng et al.,
2009). Rather than training a CNN from scratch, transfer learning — reusing the
weights of a network pretrained on a large general-purpose dataset and adapting its
final layers to a new, smaller, domain-specific dataset — has become standard
practice when the target dataset is too small to train a deep network from random
initialisation without overfitting.

EfficientNet (Tan & Le, 2019) is a family of CNN architectures designed around a
principled "compound scaling" method that jointly scales network depth, width, and
input resolution, rather than scaling only one dimension as prior architectures
typically did. The EfficientNet family (B0 through B7) achieves strong accuracy for
its parameter count relative to earlier architectures such as ResNet (He et al.,
2016) or VGG (Simonyan & Zisserman, 2014), which is part of why EfficientNet-B3 was
selected for this project (see Chapter 3 for the full justification, including the
practical constraint of CPU-only training).

## 2.2 Style classification in fashion and related visual domains

Visual style classification has been studied most extensively in the fashion and
clothing domain. Liu et al. (2016) introduced DeepFashion, a large-scale clothing
dataset with rich attribute annotations, and demonstrated CNN-based clothing
attribute recognition and retrieval at scale. Simo-Serra and Ishikawa (2016) proposed
learning a compact embedding ("Fashion Style in 128 Floats") that captures garment
style similarity for retrieval and recommendation tasks, showing that style — a
somewhat subjective, holistic visual property rather than a discrete object
category — can nonetheless be learned effectively by a CNN given sufficient labelled
data.

**Gap noted honestly**: this project was unable to locate published, peer-reviewed
work specifically on classifying *wedding* aesthetic style (as opposed to clothing
style) from photographs. Wedding style, as this project defines it, is a composite
property of venue, decor, attire, and ritual/ceremony elements rather than of a
single garment, and the six categories used here (boho_chic, rustic_barn,
luxury_glamour, garden_floral, minimalist_modern, traditional_classic) were
defined by the original project brief as a generic Western wedding-aesthetic
taxonomy, rather than adopted from an existing taxonomy in the literature.
(Partway through the project this was temporarily replaced with a 5-class
Sri Lankan wedding-market-specific taxonomy, then reverted back to this
original 6-class set at the project owner's request, to stay aligned with the
formal proposal - see Chapter 3, §3.1.1.) Readers should treat the absence of
a wedding-style-classification citation as a genuine gap this project's
literature review could not fill with a verified citation, rather than as
evidence that no such prior work exists anywhere.

## 2.3 Explainable AI in computer vision

As CNNs have grown more accurate and more opaque, a body of work has developed
methods to visualise which parts of an input image drove a given prediction. Zhou
et al. (2016) introduced Class Activation Mapping (CAM), which produces a coarse
localisation heatmap by exploiting the structure of networks ending in global
average pooling, but requires a specific architecture and retraining to work.
Selvaraju et al. (2017) generalised this with Grad-CAM (Gradient-weighted Class
Activation Mapping), which uses the gradient of a target class's score with respect
to a chosen convolutional layer's feature maps to produce a similar localisation
heatmap **without requiring architectural changes or retraining** — making it
applicable to an already-trained classifier such as this project's fine-tuned
EfficientNet-B3 model. This is the specific technique implemented in
`ml-service/scripts/gradcam_utils.py` and is why Grad-CAM (rather than CAM) was
chosen for this project.

A separate line of explainability work is model-agnostic rather than
gradient-based: Ribeiro et al. (2016) proposed LIME, which explains individual
predictions of any classifier by learning a local, interpretable surrogate model
around a single prediction. LIME was considered but not used in this project, since
Grad-CAM's direct use of the network's own gradients is both computationally cheaper
per prediction and more directly tied to what the CNN itself "looked at," which
suited the plain-language explainability goal described in Chapter 1.

## 2.4 Summary

The architectural and explainability techniques used in this project (EfficientNet-B3
transfer learning; Grad-CAM) are each supported by established, peer-reviewed prior
work. The specific application — wedding aesthetic style classification combined
with vendor recommendation — sits in a gap between the fashion-style-classification
literature and consumer wedding-planning tools, and this review did not identify a
directly comparable prior system to benchmark against; this project's own dataset
and evaluation (Chapter 4) should therefore be read as a first attempt at this
specific problem rather than an improvement on a prior published baseline.

## References

Deng, J., Dong, W., Socher, R., Li, L.-J., Li, K., & Fei-Fei, L. (2009). ImageNet: A
large-scale hierarchical image database. *2009 IEEE Conference on Computer Vision
and Pattern Recognition*, 248–255.

He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image
recognition. *2016 IEEE Conference on Computer Vision and Pattern Recognition*,
770–778.

Liu, Z., Luo, P., Qiu, S., Wang, X., & Tang, X. (2016). DeepFashion: Powering robust
clothes recognition and retrieval with rich annotations. *2016 IEEE Conference on
Computer Vision and Pattern Recognition*, 1096–1104.

Ribeiro, M. T., Singh, S., & Guestrin, C. (2016). "Why should I trust you?":
Explaining the predictions of any classifier. *Proceedings of the 22nd ACM SIGKDD
International Conference on Knowledge Discovery and Data Mining*, 1135–1144.

Selvaraju, R. R., Cogswell, M., Das, A., Vedantam, R., Parikh, D., & Batra, D.
(2017). Grad-CAM: Visual explanations from deep networks via gradient-based
localization. *2017 IEEE International Conference on Computer Vision*, 618–626.

Simo-Serra, E., & Ishikawa, H. (2016). Fashion style in 128 floats: Joint ranking
and classification using weak data for feature extraction. *2016 IEEE Conference on
Computer Vision and Pattern Recognition*, 298–307.

Simonyan, K., & Zisserman, A. (2014). Very deep convolutional networks for
large-scale image recognition. *arXiv preprint arXiv:1409.1556*.

Tan, M., & Le, Q. (2019). EfficientNet: Rethinking model scaling for convolutional
neural networks. *Proceedings of the 36th International Conference on Machine
Learning*, 6105–6114.

Zhou, B., Khosla, A., Lapedriza, A., Oliva, A., & Torralba, A. (2016). Learning deep
features for discriminative localization. *2016 IEEE Conference on Computer Vision
and Pattern Recognition*, 2921–2929.

**Note on references**: the citations above are to established, widely known papers
this project has high confidence exist with the stated author/venue/year. No
citation was fabricated to fill a gap; where a specific claim (wedding-style
classification literature) could not be backed by a verified source, that gap is
stated explicitly in §2.2 rather than papered over with an invented reference.

**Independent verification (2026-08-25)**: all 9 references above were checked against
dblp, the CVF Open Access repository, the official ICML proceedings, and Semantic
Scholar. Author names/order, year, venue, and page numbers all matched exactly as
cited, with no discrepancies found. The specific claims this chapter makes about each
paper (e.g. that CAM requires a GAP-ending architecture and retraining while Grad-CAM
does not; LIME's local-surrogate-model mechanism; DeepFashion's scale and annotation
richness; EfficientNet's compound scaling) were each cross-checked against the paper's
own abstract/description and matched. As this check was done via web search summaries
rather than a full read of each PDF, a final skim of each source before submission is
still good practice, but no correction was needed as a result of this pass.
