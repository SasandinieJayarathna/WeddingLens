// In plain terms: a lookup table of "for this style name, show this label,
// these colours, these words" - used as backup colours if the AI can't pull
// real ones from the photo.
//
// Static "Style Dashboard" content per wedding style category: a display
// name, a reference colour palette, and a handful of keywords/decor cues.
// This is not model output - it's fixed reference content shown alongside a
// prediction so a user unfamiliar with these terms gets a quick,
// plain-language sense of what the predicted style actually looks/feels
// like, not just a bare label.
//
// TAXONOMY NOTE: this is the ORIGINAL 6-class generic-aesthetic taxonomy
// from the formal project proposal (boho_chic, rustic_barn, luxury_glamour,
// garden_floral, minimalist_modern, traditional_classic). A later 5-class
// Sri Lankan wedding-market taxonomy (sinhala_kandyan, tamil_hindu_traditional,
// western_white, modern_fusion, indian_influenced) was tried and then
// reverted back to this original set at the project owner's request, to stay
// aligned with the proposal - see CLAUDE.md and
// ml-service/archive_5class_taxonomy/ for that experiment's own record.
//
// `palette` here is only a FALLBACK: PredictionCard.jsx prefers the real,
// photo-specific palette the backend extracts from the actual uploaded
// image via k-means colour clustering (see
// ml-service/scripts/09_predict.py's extract_dominant_colors and the
// `dominant_colors` field on a prediction result), and only falls back to
// these hand-picked reference colours if that extraction genuinely failed
// for a given image.

const STYLE_INFO = {
  boho_chic: {
    label: "Boho Chic",
    palette: ["#C97C5D", "#8A9A5B", "#F5EDE0", "#D4A017", "#C08497"],
    keywords: [
      "Macrame & pampas grass accents",
      "Dried florals & greenery arches",
      "Relaxed outdoor or barn-adjacent setting",
      "Flowing, unstructured gown",
      "Warm string lighting",
    ],
    decorSuggestion:
      "Pampas grass, macrame backdrops, dried florals, and warm terracotta-and-sage tones suit this relaxed, free-spirited bohemian style.",
  },
  rustic_barn: {
    label: "Rustic / Barn",
    palette: ["#6B4226", "#D9C9A3", "#8B5E34", "#3E5641", "#E8DCC4"],
    keywords: [
      "Wooden barn or farmhouse venue",
      "Mason jars & burlap accents",
      "Wildflower centerpieces",
      "String lights overhead",
      "Hay bale or wooden bench seating",
    ],
    decorSuggestion:
      "Wooden crates, mason jar centerpieces, wildflowers, and string-lit barn rafters suit this warm, countryside-inspired rustic style.",
  },
  luxury_glamour: {
    label: "Luxury / Glamour",
    palette: ["#1C1C1C", "#C9A227", "#5C1A28", "#F5F0E6", "#B8B8B8"],
    keywords: [
      "Crystal chandeliers & candelabras",
      "Opulent floral installations",
      "Black-tie ballroom setting",
      "Gold & metallic accents",
      "Sequinned or beaded gown",
    ],
    decorSuggestion:
      "Crystal chandeliers, gold candelabras, and opulent floral installations in a grand ballroom suit this glamorous, high-end luxury style.",
  },
  garden_floral: {
    label: "Garden / Floral",
    palette: ["#F3C6D3", "#9CAF88", "#D8CCE8", "#FBF7F0", "#F0DC82"],
    keywords: [
      "Lush garden or greenhouse venue",
      "Abundant blooming florals",
      "Pastel colour palette",
      "Greenery arches & floral walls",
      "Romantic, airy atmosphere",
    ],
    decorSuggestion:
      "Blooming floral arches, lush greenery, and a soft pastel palette suit this romantic, nature-immersed garden style.",
  },
  minimalist_modern: {
    label: "Minimalist / Modern",
    palette: ["#FFFFFF", "#1A1A1A", "#B0B0B0", "#D6C7B8", "#E8E4DD"],
    keywords: [
      "Clean lines & geometric structures",
      "Monochrome or neutral palette",
      "Sparse, understated florals",
      "Modern architectural venue",
      "Sleek, tailored attire",
    ],
    decorSuggestion:
      "Clean geometric structures, a neutral monochrome palette, and sparse, architectural floral accents suit this understated, contemporary minimalist style.",
  },
  traditional_classic: {
    label: "Traditional / Classic",
    palette: ["#FFFFF0", "#7B1E2B", "#C9A227", "#1B2A4A", "#FFFFFF"],
    keywords: [
      "Formal church or ballroom ceremony",
      "Classic white or ivory gown",
      "Elegant, timeless floral arrangements",
      "Candlelit ambiance",
      "Traditional seated reception",
    ],
    decorSuggestion:
      "Elegant candlelit ambiance, classic ivory-and-gold florals, and a formal church or ballroom setting suit this timeless, traditional classic style.",
  },
};

/** Look up style info, falling back to a generic shape if an unknown style
 * code ever appears (defensive - keeps the UI from crashing on bad data). */
export function getStyleInfo(styleCode) {
  return (
    STYLE_INFO[styleCode] || {
      label: styleCode,
      palette: ["#CCCCCC"],
      keywords: [],
      decorSuggestion: "",
    }
  );
}

export default STYLE_INFO;
