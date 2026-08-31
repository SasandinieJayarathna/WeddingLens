import { getCategoryInfo } from "../data/vendorCategoryInfo";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "./VendorCard.css";

/**
 * In plain terms: this draws ONE vendor's card (photo, name, rating,
 * contact/social links) - reused everywhere a vendor is shown.
 *
 * Shared vendor display card: a real photo (each vendor has its OWN
 * distinct photo, not the same one repeated across a category), name,
 * rating (only if one is genuinely on record), location/intro, and real
 * social/website links as icon buttons (only the ones that were actually
 * found for that vendor - most vendors won't have all four, some none).
 *
 * image_url is either an absolute Unsplash URL (categories not yet backed
 * by local photos - see backend/db/seed.sql's sourcing notes for why those
 * are representative stock photos, not that vendor's real work) or a
 * relative /vendor-images/... path served by the backend (categories with
 * real reference photos supplied directly by the project owner - see
 * server.js's /vendor-images route) - resolved against API_BASE_URL here.
 */
export default function VendorCard({ vendor, showCategory }) {
  const info = getCategoryInfo(vendor.category);
  const hasRealImage = Boolean(vendor.image_url);
  const imageSrc = resolveMediaUrl(vendor.image_url);
  const socialLinks = [
    { key: "instagram_url", label: "Instagram", icon: "📷" },
    { key: "facebook_url", label: "Facebook", icon: "👍" },
    { key: "tiktok_url", label: "TikTok", icon: "🎵" },
    { key: "website_url", label: "Website", icon: "🔗" },
  ].filter((link) => vendor[link.key]);

  return (
    <article className="card card-hoverable vendor-card">
      <div
        className="vendor-card-icon"
        style={hasRealImage ? { backgroundImage: `url(${imageSrc})` } : { background: info.gradient }}
      >
        <span className="vendor-card-badge" aria-hidden="true">
          {info.icon}
        </span>
      </div>

      <div className="vendor-card-body">
        <div className="vendor-card-heading">
          <h3>{vendor.name}</h3>
          {vendor.rating > 0 && (
            <span className="vendor-rating" aria-label={`Rated ${vendor.rating} out of 5`}>
              ★ {Number(vendor.rating).toFixed(1)}
            </span>
          )}
        </div>

        {showCategory && <p className="vendor-category-tag">{info.label}</p>}
        {vendor.location && <p className="vendor-location">📍 {vendor.location}</p>}
        {vendor.description && <p className="vendor-description">{vendor.description}</p>}
        {vendor.contact_info && (
          <p className="vendor-contact">
            <strong>Contact:</strong> {vendor.contact_info}
          </p>
        )}

        {socialLinks.length > 0 && (
          <div className="vendor-social-row">
            {socialLinks.map((link) => (
              <a
                key={link.key}
                href={vendor[link.key]}
                target="_blank"
                rel="noreferrer"
                className="vendor-social-link"
                aria-label={`${vendor.name} on ${link.label}`}
              >
                <span aria-hidden="true">{link.icon}</span> {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
