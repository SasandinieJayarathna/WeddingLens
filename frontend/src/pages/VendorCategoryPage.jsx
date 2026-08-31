import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosInstance";
import VendorCard from "../components/VendorCard";
import BackButton from "../components/BackButton";
import { getCategoryInfo } from "../data/vendorCategoryInfo";
import "./VendorCategoryPage.css";

// In plain terms: shows every vendor in ONE category (e.g. every florist).
//
// One category's full vendor listing (e.g. every florist), reached from a
// VendorCategoriesPage tile - general browsing, not tied to a detected style
// (compare VendorsByStylePage.jsx, which filters by style instead).
export default function VendorCategoryPage() {
  const { category } = useParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const info = getCategoryInfo(category);

  // Re-fetches whenever the :category route param changes (e.g. navigating
  // between category pages via links, not just a fresh page load).
  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get("/api/vendors", { params: { category } })
      .then((response) => setVendors(response.data.vendors || []))
      .catch((err) => {
        setError(err.response?.data?.error || "Couldn't reach the WeddingLens server. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="page-container vendor-category-page">
      <BackButton fallback="/vendors" label="All categories" />

      <div className="category-page-header">
        <div className="category-page-icon" style={{ background: info.gradient }} aria-hidden="true">
          <span>{info.icon}</span>
        </div>
        <div>
          <h1>{info.label}</h1>
          <p>{info.blurb}</p>
        </div>
      </div>

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
          No vendors listed in this category yet.
        </div>
      )}

      <div className="vendor-grid">
        {vendors.map((vendor) => (
          <VendorCard vendor={vendor} key={vendor.id} />
        ))}
      </div>
    </div>
  );
}
