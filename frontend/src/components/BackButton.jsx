import { useNavigate } from "react-router-dom";
import "./BackButton.css";

/**
 * In plain terms: a reusable "← Back" button used on several pages.
 *
 * Shared "go back" control for pages that don't otherwise have a way back
 * to where the user came from - e.g. VendorsByStylePage, reached from a
 * prediction's "See matching vendors" button, had no link back to that
 * result. By default prefers real browser history (so it returns to
 * wherever the user actually came from - results, compare, a saved
 * analysis, etc.) and only falls back to a fixed route when there's no
 * meaningful history to go back to (page opened directly via a
 * bookmark/shared link, or it's the first page in the tab).
 *
 * Pass `to` instead of relying on history for a page that should always go
 * to one specific, predictable destination regardless of how the user
 * arrived (e.g. "Back to home" on the top-level Vendors browsing page).
 */
export default function BackButton({ to, fallback = "/", label = "Back" }) {
  const navigate = useNavigate();

  // Picks the best available destination: an explicit `to` wins if given,
  // otherwise real browser history (window.history.length > 2 - the app's
  // own entry plus at least one prior page), else the fixed `fallback`.
  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button type="button" className="back-link" onClick={handleClick}>
      &larr; {label}
    </button>
  );
}
