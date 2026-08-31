import { Link, useLocation, useNavigate } from "react-router-dom";
import PredictionCard from "../components/PredictionCard";
import BackButton from "../components/BackButton";
import "./MultiResultsPage.css";

// In plain terms: the page shown after uploading MULTIPLE photos at once -
// shows every photo's result in a grid.
//
// Shown after uploading more than one image at once (see UploadPage) - a
// grid of the same PredictionCard used on the single-image ResultsPage, one
// per uploaded photo, each with its own confidence score per the project
// proposal's "Multi-image upload with real-time CNN inference and per-class
// confidence score display" feature.
export default function MultiResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state?.results;

  if (!results || results.length === 0) {
    return (
      <div className="page-container">
        <div className="alert alert-error" role="alert">
          No predictions to show yet. Upload some images first.
        </div>
        <button onClick={() => navigate("/upload")}>Go to upload</button>
      </div>
    );
  }

  return (
    <div className="page-container multi-results-page">
      <BackButton fallback="/upload" />
      <h1>Your styles ({results.length} images)</h1>
      <div className="multi-results-grid">
        {results.map((result, index) => (
          <PredictionCard key={index} result={result} title={`Image ${index + 1}`} />
        ))}
      </div>
      <div className="results-actions">
        <Link to="/upload" className="btn-secondary">
          Try more photos
        </Link>
      </div>
    </div>
  );
}
