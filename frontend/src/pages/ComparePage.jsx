import { useState } from "react";
import api from "../api/axiosInstance";
import PredictionCard from "../components/PredictionCard";
import BackButton from "../components/BackButton";
import { getStyleInfo } from "../data/styleInfo";
import "./ComparePage.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** One of the two upload slots in the comparison UI. */
function CompareSlot({ label, file, previewUrl, onChange }) {
  return (
    <div className="compare-slot">
      <h3>{label}</h3>
      <label className="compare-dropzone">
        {previewUrl ? (
          <img src={previewUrl} alt={`${label} preview`} className="compare-preview" />
        ) : (
          <span className="compare-placeholder">Click to choose an image</span>
        )}
        <input
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="visually-hidden"
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      </label>
      {file && <p className="compare-filename">{file.name}</p>}
    </div>
  );
}

/**
 * In plain terms: the page where you upload exactly TWO photos and see their
 * styles side by side.
 *
 * Dedicated 2-image comparison flow: two fixed upload slots, one
 * POST /api/predict call for both images together, then both PredictionCards
 * shown side by side plus a plain-language summary of how they compare.
 */
export default function ComparePage() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [previewA, setPreviewA] = useState(null);
  const [previewB, setPreviewB] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Client-side type/size check, mirroring the backend's own validation
  // (middleware/upload.js) so obviously-bad files are rejected instantly
  // instead of round-tripping to the server first.
  const validate = (file) => {
    if (!file) return null;
    if (!ACCEPTED_TYPES.includes(file.type)) return "Please choose a JPEG, PNG, or WEBP image.";
    if (file.size > MAX_SIZE_BYTES) return "That image is too large. Please choose a file under 5MB.";
    return null;
  };

  // Validates and stores a newly chosen file into slot "A" or "B",
  // regenerating that slot's preview URL.
  const handleChange = (which, file) => {
    setError(null);
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (which === "A") {
      setFileA(file);
      setPreviewA(file ? URL.createObjectURL(file) : null);
    } else {
      setFileB(file);
      setPreviewB(file ? URL.createObjectURL(file) : null);
    }
  };

  // Sends both images in ONE POST /api/predict request (not two separate
  // ones) so the backend loads the model just once for the pair - see
  // predictController.js's header comment for why that matters for latency.
  const handleCompare = async () => {
    if (!fileA || !fileB) {
      setError("Please choose two images to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("images", fileA);
    formData.append("images", fileB);

    try {
      const response = await api.post("/api/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(response.data.results);
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.error || "Something went wrong comparing those images.");
      } else {
        setError("Couldn't reach the WeddingLens server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  // Builds a plain-language one-liner summarizing the two results (same
  // style vs. different styles + confidences), or null while there's nothing
  // valid to summarize yet.
  const comparisonSummary = (() => {
    if (!results || results.length !== 2 || results[0].error || results[1].error) return null;
    const [a, b] = results;
    if (a.predicted_style === b.predicted_style) {
      return `Both images matched the same style: ${getStyleInfo(a.predicted_style).label}.`;
    }
    return `Image 1 leans ${getStyleInfo(a.predicted_style).label} (${Math.round(a.confidence * 100)}%), while Image 2 leans ${getStyleInfo(b.predicted_style).label} (${Math.round(b.confidence * 100)}%).`;
  })();

  return (
    <div className="page-container compare-page">
      <BackButton fallback="/upload" />
      <h1>Compare two styles</h1>
      <p>Upload two inspiration photos to see how their detected styles compare, side by side.</p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="compare-upload-row">
        <CompareSlot label="Image 1" file={fileA} previewUrl={previewA} onChange={(f) => handleChange("A", f)} />
        <CompareSlot label="Image 2" file={fileB} previewUrl={previewB} onChange={(f) => handleChange("B", f)} />
      </div>

      <button onClick={handleCompare} disabled={!fileA || !fileB || loading}>
        {loading ? "Comparing..." : "Compare styles"}
      </button>

      {loading && (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Analysing both images, this can take a little longer than a single upload...</span>
        </div>
      )}

      {comparisonSummary && (
        <div className="alert alert-success" role="status">
          {comparisonSummary}
        </div>
      )}

      {results && (
        <div className="compare-results-grid">
          <PredictionCard result={results[0]} title="Image 1" />
          <PredictionCard result={results[1]} title="Image 2" />
        </div>
      )}
    </div>
  );
}
