import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import BackButton from "../components/BackButton";
import "./UploadPage.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // keep in sync with backend MAX_UPLOAD_BYTES
const MAX_IMAGES = 5; // keep in sync with backend routes/predict.js's MAX_IMAGES_PER_REQUEST

/**
 * In plain terms: the page where you pick your photo(s) and click "Identify
 * my style" - the app's main feature.
 *
 * Main entry point for the core feature: pick or drag-drop 1-5 wedding
 * inspiration photos, validate them client-side, submit them to
 * POST /api/predict in one request, then route to the single-image
 * ResultsPage or the multi-image MultiResultsPage depending on how many
 * were sent.
 */
export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Validates and appends newly picked/dropped files to the existing
  // selection (rather than replacing it), so drag-dropping more images after
  // an initial pick adds to the batch instead of starting over. Rejects any
  // file that's the wrong type, too large, or would push the batch over
  // MAX_IMAGES, but keeps processing the rest of the batch rather than
  // aborting entirely.
  const addFiles = useCallback(
    (fileList) => {
      setError(null);
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;

      const combined = [...files];
      for (const candidate of incoming) {
        if (!ACCEPTED_TYPES.includes(candidate.type)) {
          setError("Please choose only JPEG, PNG, or WEBP images.");
          continue;
        }
        if (candidate.size > MAX_SIZE_BYTES) {
          setError("One of those images is too large. Please choose files under 5MB each.");
          continue;
        }
        if (combined.length >= MAX_IMAGES) {
          setError(`You can upload up to ${MAX_IMAGES} images at once.`);
          break;
        }
        combined.push(candidate);
      }

      setFiles(combined);
      setPreviews(combined.map((f) => URL.createObjectURL(f)));
    },
    [files]
  );

  // Drops one file from the selection by position and regenerates preview
  // URLs to match.
  const removeFile = (index) => {
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
  };

  // Drag-and-drop handler for the dropzone - hands the dropped files to the
  // same validation path as the file picker input.
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // Sends every selected file to POST /api/predict as one multipart request,
  // then routes to whichever results page matches the response shape (see
  // the backend's routes/predict.js for why the shape depends on count).
  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please choose at least one image first.");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    try {
      const response = await api.post("/api/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Single image -> the backend returns the prediction object directly
      // (backward-compatible shape); 2+ images -> { results: [...] }.
      if (response.data.results) {
        navigate("/results-multi", { state: { results: response.data.results } });
      } else {
        navigate("/results", { state: response.data });
      }
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        setError("The request took too long. Please try again.");
      } else if (err.response) {
        setError(err.response.data?.error || "Something went wrong analysing that image.");
      } else {
        setError("Couldn't reach the WeddingLens server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container upload-page">
      <BackButton fallback="/" />
      <h1>Find your wedding style</h1>
      <p>
        Upload one or more photos you love from a wedding, venue, or inspiration board, and we'll
        identify the style and recommend matching vendors for each one. Want to compare two
        specific photos side by side instead? Try the <Link to="/compare">Compare Styles</Link> page.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div
        className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload wedding inspiration images"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        {previews.length > 0 ? (
          <div className="preview-grid">
            {previews.map((url, i) => (
              <div className="preview-thumb" key={url}>
                <img src={url} alt={`Selected wedding inspiration preview ${i + 1}`} />
                <button
                  type="button"
                  className="preview-remove"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="dropzone-title">Drag & drop image(s) here</p>
            <p className="dropzone-subtitle">
              or click to browse (JPEG, PNG, WEBP - max 5MB each, up to {MAX_IMAGES} images)
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="visually-hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      <div className="upload-actions">
        <button onClick={handleSubmit} disabled={files.length === 0 || loading}>
          {loading
            ? "Analysing..."
            : files.length > 1
            ? `Identify ${files.length} styles`
            : "Identify my style"}
        </button>
        {files.length > 0 && !loading && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setFiles([]);
              setPreviews([]);
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {loading && (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Analysing your image{files.length > 1 ? "s" : ""}, this can take a few seconds...</span>
        </div>
      )}
    </div>
  );
}
