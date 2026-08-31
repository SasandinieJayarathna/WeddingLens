// In plain terms: the web addresses for looking up vendors - either matching
// a detected style, matching a category, or just listing all the categories.
//
// GET /api/vendors?style=<style>      - vendors matching a detected wedding style
// GET /api/vendors?category=<category> - all vendors in one category (general browsing)
// GET /api/vendors/categories          - every category + how many vendors are in it

const express = require("express");
const {
  getVendorsByStyle,
  getVendorsByCategory,
  getCategoryCounts,
  isValidStyle,
  isValidCategory,
  VALID_STYLES,
  VALID_CATEGORIES,
} = require("../controllers/vendorController");

const router = express.Router();

// Returns every vendor category with its vendor count, for the category
// browsing grid on /vendors.
router.get("/categories", async (req, res) => {
  try {
    const categories = await getCategoryCounts();
    return res.status(200).json({ categories });
  } catch (err) {
    console.error("Category listing failed:", err.message);
    return res.status(500).json({ error: "Could not load vendor categories right now. Please try again shortly." });
  }
});

// Dispatches to one of two lookups depending on which query param was sent:
// ?style=... for the "vendors matching my detected style" flow, or
// ?category=... for general "browse everyone in this category" flow.
router.get("/", async (req, res) => {
  const { style, category } = req.query;

  if (!style && !category) {
    return res.status(400).json({ error: "Provide a 'style' or 'category' query parameter." });
  }

  try {
    if (category) {
      if (!isValidCategory(category)) {
        return res.status(400).json({
          error: `Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        });
      }
      const vendors = await getVendorsByCategory(category);
      return res.status(200).json({ category, count: vendors.length, vendors });
    }

    if (!isValidStyle(style)) {
      return res.status(400).json({
        error: `Invalid style "${style}". Must be one of: ${[...VALID_STYLES].join(", ")}`,
      });
    }
    const vendors = await getVendorsByStyle(style);
    return res.status(200).json({ style, count: vendors.length, vendors });
  } catch (err) {
    console.error("Vendor lookup failed:", err.message);
    return res.status(500).json({ error: "Could not fetch vendors right now. Please try again shortly." });
  }
});

module.exports = router;
