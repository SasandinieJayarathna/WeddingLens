import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import "./LandingPage.css";

// Hero photo sourced from the Unsplash API (properly licensed under the
// Unsplash License, same source used for this project's training dataset -
// see ml-service/scripts/01_collect_dataset.py) rather than a stock image of
// unclear origin. The Unsplash License does not require on-page attribution
// (unlike the individually-credited category photos on /vendors, which are
// bulk-sourced from search results and credited there per Unsplash's
// guidelines for that usage pattern).
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1615966650071-855b15f29ad1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=80";

// In plain terms: this is the very first page a visitor sees - the welcome
// screen with the big photo and "Upload a photo" button.
//
// Public marketing/entry page at "/" - full-screen hero with a photo
// background, a primary CTA that adapts to login state (see AuthContext),
// a 3-step "how it works" explainer, and a closing CTA band.
export default function LandingPage() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="landing-page">
      <section className="landing-hero" style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}>
        <div className="landing-hero-overlay">
          <div className="landing-hero-content">
            <Logo size={56} variant="light" wordmark className="landing-brand" />
            <h1>Every wedding tells a story. Let's find yours.</h1>
            <p>
              Upload a photo that makes your heart skip a beat, and we'll help you put a name
              to the feeling - then connect you with the people in Sri Lanka who can bring it
              to life.
            </p>
            <div className="landing-cta-row">
              {isLoggedIn ? (
                <Link to="/login" className="btn landing-cta-primary">
                  Upload a photo <span aria-hidden="true">&rarr;</span>
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn landing-cta-primary">
                    Get started <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <Link to="/login" className="btn-secondary landing-cta-secondary">
                    Log in
                  </Link>
                </>
              )}
            </div>
            <Link to="/upload" className="landing-guest-link">
              Or try it now without an account &rarr;
            </Link>
          </div>
        </div>
        <div className="landing-scroll-cue" aria-hidden="true">
          <span />
        </div>
      </section>

      <section className="landing-how">
        <div className="landing-how-inner">
          <span className="landing-section-kicker">The process</span>
          <h2>How it works</h2>
          <div className="landing-steps">
            <div className="landing-step">
              <span className="landing-step-number">1</span>
              <h3>Upload your inspiration</h3>
              <p>A photo from Pinterest, Instagram, or your own imagination - any wedding photo you love.</p>
            </div>
            <div className="landing-step">
              <span className="landing-step-number">2</span>
              <h3>See your style, explained</h3>
              <p>
                Our model names the aesthetic and shows exactly which parts of the photo led it
                there, with a heatmap you can actually understand.
              </p>
            </div>
            <div className="landing-step">
              <span className="landing-step-number">3</span>
              <h3>Meet vendors who match</h3>
              <p>Real Sri Lankan florists, photographers, venues, and more - matched to your style.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-footer-cta gradient-panel">
        <div className="landing-footer-glow" aria-hidden="true" />
        <Logo size={40} variant="light" wordmark={false} className="landing-footer-mark" />
        <h2>Ready to see your style?</h2>
        <p>No commitment, no credit card - just upload a photo and see what we find.</p>
        <Link to="/upload" className="btn landing-footer-btn">
          Start now
        </Link>
      </section>
    </div>
  );
}
