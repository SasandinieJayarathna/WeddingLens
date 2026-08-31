// In plain terms: a lookup table of "for this category name, show this
// label, icon, colour, and photo" - used on the vendor browsing pages.
//
// Display metadata for the 12 vendor categories, used by the vendor
// category-browsing grid and category detail pages. Order here also
// controls display order (kept in sync with the backend's VALID_CATEGORIES
// order in backend/controllers/vendorController.js).
//
// Most categories show a real photo supplied directly by the project owner
// as local files (see ml-service/notebooks/<Category>/ for the originals,
// served from backend/vendor-images/<category>/ - see server.js). This was
// the resolution to an earlier limitation: Claude can't reliably or safely
// scrape real photos from Instagram/Pinterest (session-gated, expiring
// URLs, unclear licensing), so the project owner sourced these themselves.
// `venue` is the one category still on a generic Unsplash photo (no local
// venue photos supplied yet) - properly licensed under the Unsplash
// License, credited per their attribution guidelines.

const VENDOR_CATEGORY_INFO = {
  venue: {
    label: "Venues & Hotels",
    icon: "🏛️",
    gradient: "linear-gradient(135deg, #7a414a, #b8788a)",
    blurb: "Hotels, resorts, and halls to host your celebration.",
    image: "https://images.unsplash.com/photo-1723832348140-a2d9eb1753b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=75",
    photographer: "Jennifer Kalenberg",
    photographerUrl: "https://unsplash.com/@jkalen71",
  },
  photography_videography: {
    label: "Photography & Videography",
    icon: "📷",
    gradient: "linear-gradient(135deg, #2b2b2b, #5c5c5c)",
    blurb: "Studios that capture your day in photos and film.",
    image: "/vendor-images/photography_videography/photography_videography_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  decorator: {
    label: "Decorators",
    icon: "🎀",
    gradient: "linear-gradient(135deg, #7c8b6f, #a9bb9a)",
    blurb: "Stage, table, and venue styling to bring your theme to life.",
    image: "/vendor-images/decorator/decorator_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  florist: {
    label: "Florists",
    icon: "🌸",
    gradient: "linear-gradient(135deg, #d98a8a, #eac0c0)",
    blurb: "Bouquets, garlands, and floral installations.",
    image: "/vendor-images/florist/florist_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  cake_artist: {
    label: "Cake Artists",
    icon: "🎂",
    gradient: "linear-gradient(135deg, #c9a227, #e8cf8e)",
    blurb: "Wedding cakes from classic tiers to sculptural showstoppers.",
    image: "/vendor-images/cake_artist/cake_artist_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  bridal_wear: {
    label: "Bridal Wear",
    icon: "👰",
    gradient: "linear-gradient(135deg, #8c1c2b, #c96b78)",
    blurb: "Sarees, gowns, and Kandyan bridal outfits.",
    image: "/vendor-images/bridal_wear/bridal_wear_09.jpg",
    photographer: null,
    photographerUrl: null,
  },
  groom_wear: {
    label: "Groom's Wear",
    icon: "🤵",
    gradient: "linear-gradient(135deg, #1a1a1a, #4a4a4a)",
    blurb: "National dress, suits, and tuxedos for the groom's party.",
    image: "/vendor-images/groom_wear/groom_wear_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  makeup_artist: {
    label: "Makeup Artists",
    icon: "💄",
    gradient: "linear-gradient(135deg, #b76e79, #e0a5ae)",
    blurb: "Bridal makeup and hairstyling for the big day.",
    image: "/vendor-images/makeup_artist/makeup_artist_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  jewellery: {
    label: "Jewellery",
    icon: "💍",
    gradient: "linear-gradient(135deg, #c9a227, #f5e6c8)",
    blurb: "Bridal jewellery, from gold to gemstones.",
    image: "/vendor-images/jewellery/jewellery_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  caterer: {
    label: "Caterers",
    icon: "🍽️",
    gradient: "linear-gradient(135deg, #5f6c55, #8fa07f)",
    blurb: "Menus and catering service for your reception.",
    image: "/vendor-images/caterer/caterer_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  rental: {
    label: "Rentals",
    icon: "🪑",
    gradient: "linear-gradient(135deg, #6b6367, #9a9296)",
    blurb: "Tables, chairs, cutlery, and event equipment hire.",
    image: "/vendor-images/rental/rental_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
  wedding_planner: {
    label: "Wedding Planners",
    icon: "📋",
    gradient: "linear-gradient(135deg, #7a414a, #94525c)",
    blurb: "Full-service planning and on-the-day coordination.",
    image: "/vendor-images/wedding_planner/wedding_planner_01.jpg",
    photographer: null,
    photographerUrl: null,
  },
};

/** Look up display info for a category, falling back to a generic shape for
 * an unrecognised category code (defensive - keeps the UI from crashing on
 * bad/unexpected data instead of just not styling that one card). */
export function getCategoryInfo(category) {
  return (
    VENDOR_CATEGORY_INFO[category] || {
      label: category,
      icon: "✨",
      gradient: "linear-gradient(135deg, #94525c, #b8788a)",
      blurb: "",
      image: null,
      photographer: null,
      photographerUrl: null,
    }
  );
}

export default VENDOR_CATEGORY_INFO;
