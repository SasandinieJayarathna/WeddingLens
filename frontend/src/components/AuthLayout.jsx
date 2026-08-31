import { Link } from "react-router-dom";
import BackButton from "./BackButton";
import Logo from "./Logo";
import "./AuthLayout.css";

// In plain terms: this is the shared page frame both the Login and Signup
// pages sit inside - the pretty photo panel on one side, the form on the other.
//
// Real, properly-licensed Unsplash photo (same sourcing approach as the
// landing page hero) rather than the flat gradient this panel used before.
const BRAND_PANEL_IMAGE_URL =
  "https://images.unsplash.com/photo-1607357910286-1ff94ac13c24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1000&q=80";

/**
 * Shared split-panel shell for the Login and Signup pages: a decorative
 * brand panel on one side (photo + gradient wash + tagline, purely visual -
 * no interactive content) and the actual form on the other. Collapses to a
 * single column with a smaller top banner on narrow screens.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-layout">
      <aside
        className="auth-brand-panel"
        aria-hidden="true"
        style={{ backgroundImage: `url(${BRAND_PANEL_IMAGE_URL})` }}
      >
        <div className="auth-brand-scrim gradient-panel">
          <div className="auth-brand-content">
            <Logo size={30} variant="light" className="auth-brand-mark" />
            <h2 className="auth-brand-heading">Find the style, save the story.</h2>
            <p className="auth-brand-copy">
              Upload a photo, see the style behind it, and keep every analysis in one
              personal inspiration board as you plan.
            </p>
          </div>
        </div>
      </aside>

      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <BackButton fallback="/" label="Back to home" />
          <Link to="/" className="auth-form-brand">
            <Logo size={28} />
          </Link>
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
          {footer && <p className="auth-footer-line">{footer}</p>}
          <p className="auth-footer-line auth-guest-line">
            Just browsing? <Link to="/upload">Continue as a guest</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
