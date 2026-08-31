import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import BackButton from "../components/BackButton";
import { getCategoryInfo } from "../data/vendorCategoryInfo";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "./VendorCategoriesPage.css";

// In plain terms: the page showing all 12 vendor categories as tiles to
// click through (the Navbar's "Vendors" tab).
//
// General "browse all vendors" entry point (the Navbar's "Vendors" tab) -
// distinct from the style-matched vendor list reached from a prediction's
// "See matching vendors" button (see VendorsByStylePage.jsx / /vendors/style/:style).
export default function VendorCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Loads every category + its vendor count once, on mount.
  useEffect(() => {
    api
      .get("/api/vendors/categories")
      .then((response) => setCategories(response.data.categories || []))
      .catch((err) => {
        setError(err.response?.data?.error || "Couldn't reach the WeddingLens server. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, []);

  const totalVendors = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="page-container vendor-categories-page">
      <BackButton to="/" label="Back to home" />
      <h1>Browse vendors</h1>
      <p>
        {totalVendors > 0
          ? `${totalVendors} Sri Lankan wedding vendors across ${categories.length} categories.`
          : "Explore wedding vendors by category."}{" "}
        Pick a category to see everyone we know about.
      </p>

      {loading && (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Loading categories...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="category-grid">
        {categories.map(({ category }) => {
          const info = getCategoryInfo(category);
          return (
            <Link to={`/vendors/category/${category}`} key={category} className="category-card">
              <div
                className="category-card-icon"
                style={
                  info.image
                    ? { backgroundImage: `url(${resolveMediaUrl(info.image)})` }
                    : { background: info.gradient }
                }
              >
                <span className="category-card-badge" aria-hidden="true">
                  {info.icon}
                </span>
              </div>
              <div className="category-card-body">
                <h2>{info.label}</h2>
                <p>{info.blurb}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
