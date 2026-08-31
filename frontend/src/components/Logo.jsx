import "./Logo.css";

// In plain terms: this draws the WeddingLens logo (the "W | L" mark) directly
// with code - it's not an image file, so it stays crisp at any size.
//
// WeddingLens brand mark: a "W | L" serif monogram with a thin divider and
// a small botanical sprig, ringed by a delicate laurel-style wreath frame -
// matching the elegant, single-ink wedding-monogram style the project owner
// referenced (e.g. Etsy-style wedding logo sheets: serif initials + fine
// botanical linework, often circled by a thin wreath rather than a square
// box). Uses the site's own display typeface (Playfair Display, already
// loaded site-wide via index.html) so the mark shares letterforms with
// every heading.
//
// `variant` picks a single ink colour: "brand" (the site's rose-brown ink,
// for light surfaces) or "light" (cream, for the dark photo-scrim
// backgrounds behind it on the landing hero and auth pages).
const INK = {
  brand: "#7a414a",
  light: "#f8ece7",
};

const WREATH_LEAF_COUNT = 22;
const WREATH_RADIUS = 26;

// Draws the laurel-style ring of small leaves around the monogram. Leaf
// positions are computed by trig (evenly spaced around a circle, each
// rotated to sit tangentially on the ring) rather than hand-placed, so the
// wreath renders correctly at any size without needing per-leaf coordinates.
function WreathRing({ ink }) {
  const leaves = Array.from({ length: WREATH_LEAF_COUNT }, (_, i) => {
    const angleDeg = (360 / WREATH_LEAF_COUNT) * i;
    const angleRad = (angleDeg * Math.PI) / 180;
    const cx = 32 + WREATH_RADIUS * Math.cos(angleRad);
    const cy = 32 + WREATH_RADIUS * Math.sin(angleRad);
    const rotate = angleDeg + 90; // tangential, so leaves follow the ring's curve
    return <ellipse key={i} cx={cx} cy={cy} rx="3" ry="1.05" transform={`rotate(${rotate} ${cx} ${cy})`} />;
  });
  return (
    <g fill={ink} stroke="none" opacity="0.6">
      {leaves}
    </g>
  );
}

export function LogoMark({ size = 40, variant = "brand", className = "" }) {
  const ink = INK[variant] || INK.brand;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <WreathRing ink={ink} />

      <g transform="translate(0,-4)" fill="none" stroke={ink}>
        {/* W | L monogram, set in the site's own display serif */}
        <text
          x="29"
          y="40"
          textAnchor="end"
          fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
          fontSize="24"
          fontWeight="600"
          fill={ink}
          stroke="none"
        >
          W
        </text>
        <text
          x="35"
          y="40"
          textAnchor="start"
          fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
          fontSize="24"
          fontWeight="600"
          fill={ink}
          stroke="none"
        >
          L
        </text>
        <line x1="32" y1="16" x2="32" y2="42" strokeWidth="1" opacity="0.8" />

        {/* Small botanical sprig, growing down from the divider */}
        <path d="M32,42 Q31,47 32,53" strokeWidth="1" opacity="0.8" strokeLinecap="round" />
        <ellipse cx="29.3" cy="44.8" rx="2.7" ry="1.15" transform="rotate(-35 29.3 44.8)" fill={ink} stroke="none" opacity="0.85" />
        <ellipse cx="34.7" cy="44.8" rx="2.7" ry="1.15" transform="rotate(35 34.7 44.8)" fill={ink} stroke="none" opacity="0.85" />
        <ellipse cx="29.8" cy="48.3" rx="2.3" ry="1" transform="rotate(-30 29.8 48.3)" fill={ink} stroke="none" opacity="0.75" />
        <ellipse cx="34.2" cy="48.3" rx="2.3" ry="1" transform="rotate(30 34.2 48.3)" fill={ink} stroke="none" opacity="0.75" />
        <circle cx="32" cy="53.5" r="1.3" fill={ink} stroke="none" opacity="0.85" />
      </g>
    </svg>
  );
}

/** Icon + wordmark pair, for anywhere the full brand lockup is shown (navbar,
 * auth panel, landing hero). Text colour is left to inherit from whatever
 * wraps it (matches the existing pattern - .navbar-brand, .landing-brand
 * etc. already set their own color), so this stays reusable across both
 * light and dark contexts without hardcoding either. */
export default function Logo({ size = 32, variant = "brand", wordmark = true, className = "" }) {
  return (
    <span className={`logo-lockup ${className}`}>
      <LogoMark size={size} variant={variant} />
      {wordmark && <span className="logo-wordmark">WeddingLens</span>}
    </span>
  );
}
