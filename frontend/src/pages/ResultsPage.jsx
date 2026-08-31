// In plain terms: the page shown after uploading ONE photo - shows its
// style result.
import { Link, useLocation, useNavigate } from "react-router-dom";
import PredictionCard from "../components/PredictionCard";
import BackButton from "../components/BackButton";
import "./ResultsPage.css";

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;

  // If someone lands here directly (e.g. refresh, bookmark) there's no
  // prediction to show - send them back to upload instead of a blank page.
  if (!result) {
    return (
      <div className="page-container">
        <div className="alert alert-error" role="alert">
          No prediction to show yet. Upload an image first.
        </div>
        <button onClick={() => navigate("/upload")}>Go to upload</button>
      </div>
    );
  }

  return (
    <div className="page-container results-page">
      <BackButton fallback="/upload" />
      <h1>Your style</h1>
      <PredictionCard result={result} />
      <div className="results-actions">
        <Link to="/upload" className="btn-secondary">
          Try another photo
        </Link>
      </div>
    </div>
  );
}
