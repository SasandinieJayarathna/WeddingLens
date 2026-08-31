import { Link } from "react-router-dom";
import { getStyleInfo } from "../data/styleInfo";
import "./PredictionCard.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * In plain terms: this draws ONE prediction result - the photo, the heatmap,
 * the style name, colours, and confidence bars. Reused on every page that
 * shows a result, so results always look the same everywhere.
 *
 * Shared "Style Dashboard" display for a single prediction result: the
 * uploaded photo, its Grad-CAM heatmap, the predicted style's colour
 * palette + keywords + decor suggestion, and a confidence breakdown across
 * all classes (renders whatever the backend returns, so it never needs
 * updating if the style taxonomy changes). Reused by ResultsPage (single image), MultiResultsPage
 * (a grid of these), and ComparePage (two side by side), so the same
 * information is presented consistently everywhere a prediction is shown.
 */
export default function PredictionCard({ result, title }) {
  if (result.error) {
    return (
      <div className="card prediction-card prediction-card-error">
        {title && <h3>{title}</h3>}
        <div className="alert alert-error" role="alert">
          {result.error}
        </div>
      </div>
    );
  }

  const { predicted_style, confidence, all_scores, image_url, gradcam_url, dominant_colors } = result;
  const styleInfo = getStyleInfo(predicted_style);
  const confidencePercent = Math.round(confidence * 100);
  const sortedScores = all_scores ? Object.entries(all_scores).sort(([, a], [, b]) => b - a) : [];

  // Prefer the real palette extracted from THIS photo (see
  // ml-service/scripts/09_predict.py's extract_dominant_colors) over the
  // static per-style reference palette - only fall back to the static one
  // if extraction genuinely failed for this image.
  const hasRealPalette = Array.isArray(dominant_colors) && dominant_colors.length > 0;
  const palette = hasRealPalette ? dominant_colors : styleInfo.palette;

  return (
    <div className="card prediction-card">
      {title && <h3 className="prediction-card-title">{title}</h3>}

      <div className="prediction-card-images">
        {image_url && (
          <figure>
            <img src={`${API_BASE_URL}${image_url}`} alt="Uploaded wedding inspiration photo" />
            <figcaption>Your photo</figcaption>
          </figure>
        )}
        {gradcam_url && (
          <figure>
            <img
              src={`${API_BASE_URL}${gradcam_url}`}
              alt={`Heatmap highlighting the regions that led to a ${styleInfo.label} prediction`}
            />
            <figcaption>Grad-CAM heatmap</figcaption>
          </figure>
        )}
      </div>

      <h2 className="prediction-style-name">{styleInfo.label}</h2>
      <p className="prediction-confidence">{confidencePercent}% confidence</p>

      <div className="style-dashboard">
        <p className="palette-caption">
          {hasRealPalette ? "Colours extracted from your photo" : `Typical ${styleInfo.label} palette`}
        </p>
        <div
          className="style-palette"
          aria-label={hasRealPalette ? "Colours extracted from your photo" : `${styleInfo.label} colour palette`}
        >
          {palette.map((hex, i) => (
            <span key={`${hex}-${i}`} className="palette-swatch" style={{ backgroundColor: hex }} title={hex} />
          ))}
        </div>
        {styleInfo.keywords.length > 0 && (
          <ul className="style-keywords">
            {styleInfo.keywords.map((kw) => (
              <li key={kw}>{kw}</li>
            ))}
          </ul>
        )}
        {styleInfo.decorSuggestion && <p className="decor-suggestion">{styleInfo.decorSuggestion}</p>}
      </div>

      {sortedScores.length > 0 && (
        <div className="score-breakdown">
          {sortedScores.map(([style, score]) => (
            <div className="score-row" key={style}>
              <span className="score-label">{getStyleInfo(style).label}</span>
              <div className="score-bar-track" aria-hidden="true">
                <div className="score-bar-fill" style={{ width: `${Math.round(score * 100)}%` }} />
              </div>
              <span className="score-value">{Math.round(score * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <Link to={`/vendors/style/${predicted_style}`} className="btn">
        See matching vendors
      </Link>
    </div>
  );
}
