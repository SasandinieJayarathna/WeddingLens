// In plain terms: this file looks up vendors in the database - either "show
// me vendors matching this style" or "show me every vendor in this category".
//
// Query logic for fetching vendors, either by detected wedding style (the
// original "matching vendors" feature) or by category (general vendor
// browsing - see routes/vendors.js's GET /api/vendors?category=... and
// GET /api/vendors/categories). Kept separate from routes/vendors.js so the
// route file only deals with HTTP concerns and this file only deals with
// the database query itself.

const pool = require("../config/db");

const VALID_STYLES = new Set([
  "boho_chic",
  "rustic_barn",
  "luxury_glamour",
  "garden_floral",
  "minimalist_modern",
  "traditional_classic",
]);

// Kept in sync with backend/db/seed.sql's category values. Order here is
// also the order categories are listed in GET /api/vendors/categories.
const VALID_CATEGORIES = [
  "venue",
  "photography_videography",
  "decorator",
  "florist",
  "cake_artist",
  "bridal_wear",
  "groom_wear",
  "makeup_artist",
  "jewellery",
  "caterer",
  "rental",
  "wedding_planner",
];

const VENDOR_COLUMNS = `id, name, category, wedding_style, location, contact_info,
       description, image_url, rating, instagram_url, facebook_url, tiktok_url, website_url,
       image_photographer, image_photographer_url`;

// Guards against querying the DB with a style string that isn't one of the
// 6 model output classes (e.g. a typo'd query param).
function isValidStyle(style) {
  return VALID_STYLES.has(style);
}

// Same idea as isValidStyle, but for the 12 vendor categories.
function isValidCategory(category) {
  return VALID_CATEGORIES.includes(category);
}

/**
 * Fetch all vendors matching a given wedding_style, ordered by category then
 * rating (best-rated first within each category) so the frontend can group
 * them by category directly.
 */
async function getVendorsByStyle(style) {
  // Parameterized query (uses $1 placeholder, not string concatenation) -
  // this is what protects against SQL injection here.
  const result = await pool.query(
    `SELECT ${VENDOR_COLUMNS}
     FROM vendors
     WHERE wedding_style = $1
     ORDER BY category ASC, rating DESC`,
    [style]
  );
  return result.rows;
}

/**
 * Fetch every vendor in a given category, regardless of style - used by the
 * general "browse all vendors" flow (not the style-matching flow), so a user
 * can see every florist/photographer/etc. we know about, not just ones
 * matching their last uploaded photo.
 */
async function getVendorsByCategory(category) {
  const result = await pool.query(
    `SELECT ${VENDOR_COLUMNS}
     FROM vendors
     WHERE category = $1
     ORDER BY name ASC`,
    [category]
  );
  return result.rows;
}

/**
 * Counts vendors per category, for the category-browsing landing grid
 * (one card per category, showing how many vendors are listed).
 */
async function getCategoryCounts() {
  const result = await pool.query(
    `SELECT category, COUNT(*)::int AS count FROM vendors GROUP BY category`
  );
  const counts = Object.fromEntries(result.rows.map((r) => [r.category, r.count]));
  // Return every known category, even ones with 0 vendors (so the browsing
  // grid always shows all 12 category cards, not just populated ones).
  return VALID_CATEGORIES.map((category) => ({ category, count: counts[category] || 0 }));
}

module.exports = {
  getVendorsByStyle,
  getVendorsByCategory,
  getCategoryCounts,
  isValidStyle,
  isValidCategory,
  VALID_STYLES,
  VALID_CATEGORIES,
};
