import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosInstance";
import VendorCard from "../components/VendorCard";
import BackButton from "../components/BackButton";
import { getCategoryInfo } from "../data/vendorCategoryInfo";
import "./VendorsByStylePage.css";

const STYLE_LABELS = {
  boho_chic: "Boho Chic",
  rustic_barn: "Rustic / Barn",
  luxury_glamour: "Luxury / Glamour",
  garden_floral: "Garden / Floral",
  minimalist_modern: "Minimalist / Modern",
  traditional_classic: "Traditional / Classic",
};

// Category display/section order (matches vendorCategoryInfo.js / the
// backend's VALID_CATEGORIES) - the API itself returns vendors ordered
// alphabetically by category, which isn't the order we want to present.
const CATEGORY_ORDER = [
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

// In plain terms: shows every vendor that matches ONE detected style,
// grouped by category - what "See matching vendors" links to.
//
// Reached from a prediction's "See matching vendors" button
// (PredictionCard.jsx) or a saved analysis on the dashboard - vendors
// filtered to the one detected style, grouped by category. For browsing
// vendors generally (not tied to a prediction), see VendorCategoriesPage.jsx
// instead (the Navbar's "Vendors" tab).
export default function VendorsByStylePage() {
  const { style } = useParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!style) return;
    setLoading(true);
    setError(null);
    api
      .get("/api/vendors", { params: { style } })
      .then((response) => setVendors(response.data.vendors || []))
      .catch((err) => {
        setError(err.response?.data?.error || "Couldn't reach the WeddingLens server. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, [style]);

  // Groups the flat vendor list by category, then orders those groups per
  // CATEGORY_ORDER (falling back to appending any category not in that list,
  // so a future new category still shows up instead of silently vanishing).
  const vendorsByCategory = vendors.reduce((acc, vendor) => {
    (acc[vendor.category] ||= []).push(vendor);
    return acc;
  }, {});
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => vendorsByCategory[c]),
    ...Object.keys(vendorsByCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  return (
    <div className="page-container vendors-by-style-page">
      <BackButton fallback="/upload" label="Back to your results" />
      <h1>Vendors for {STYLE_LABELS[style] || style}</h1>

      {loading && (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Loading vendors...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && vendors.length === 0 && (
        <div className="alert alert-error" role="alert">
          No vendors found yet for this style. Check back soon - we're adding more vendors regularly.
        </div>
      )}

      {orderedCategories.map((category) => (
        <section key={category} className="vendor-category-section">
          <h2>{getCategoryInfo(category).label}</h2>
          <div className="vendor-grid">
            {vendorsByCategory[category].map((vendor) => (
              <VendorCard vendor={vendor} key={vendor.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
