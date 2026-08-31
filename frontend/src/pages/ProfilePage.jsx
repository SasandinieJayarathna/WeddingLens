import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import { getStyleInfo } from "../data/styleInfo";
import "./ProfilePage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * In plain terms: the "My Dashboard" page - shows stats and every photo
 * you've analysed while logged in.
 *
 * The logged-in user's dashboard: a stat summary (computed client-side from
 * their own prediction history - see the `stats` useMemo below) plus their
 * full "inspiration board" of past analyses. Redirects to a login prompt if
 * not logged in, since there's nothing personal to show an anonymous visitor.
 */
export default function ProfilePage() {
  const { isLoggedIn, user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetches this user's saved analyses once they're known to be logged in.
  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    api
      .get("/api/profile/analyses")
      .then((response) => setAnalyses(response.data.analyses || []))
      .catch((err) => {
        setError(err.response?.data?.error || "Couldn't reach the WeddingLens server. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  // Derived dashboard stats - computed client-side from the analyses list
  // rather than a separate API call, since it's the same data either way.
  const stats = useMemo(() => {
    if (analyses.length === 0) {
      return { total: 0, topStyle: null, topStyleCount: 0, avgConfidence: 0, lastDate: null };
    }
    const counts = {};
    let confidenceSum = 0;
    for (const a of analyses) {
      counts[a.predicted_style] = (counts[a.predicted_style] || 0) + 1;
      confidenceSum += a.confidence;
    }
    const [topStyle, topStyleCount] = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    const lastDate = analyses.reduce(
      (latest, a) => (new Date(a.created_at) > new Date(latest) ? a.created_at : latest),
      analyses[0].created_at
    );
    return {
      total: analyses.length,
      topStyle,
      topStyleCount,
      avgConfidence: Math.round((confidenceSum / analyses.length) * 100),
      lastDate,
    };
  }, [analyses]);

  if (!isLoggedIn) {
    return (
      <div className="page-container">
        <BackButton fallback="/" />
        <h1>My Inspiration Board</h1>
        <div className="alert alert-error" role="alert">
          Please <Link to="/login">log in</Link> to see your saved style analyses.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      <BackButton fallback="/" />
      <div className="dashboard-hero gradient-panel">
        <div>
          <p className="dashboard-eyebrow">Your dashboard</p>
          <h1>{user?.display_name ? `Welcome back, ${user.display_name}` : "Welcome back"}</h1>
          <p className="dashboard-hero-copy">
            Every photo you analyse while logged in is saved here automatically as your
            personal inspiration board.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/upload" className="btn dashboard-hero-btn">
            + Analyse a new photo
          </Link>
          <Link to="/compare" className="btn-secondary dashboard-hero-btn-secondary">
            Compare styles
          </Link>
        </div>
      </div>

      {loading && (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Loading your dashboard...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="stat-grid">
          <div className="card stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Photos analysed</span>
          </div>
          <div className="card stat-card">
            <span className="stat-value">{stats.topStyle ? getStyleInfo(stats.topStyle).label : "—"}</span>
            <span className="stat-label">
              {stats.topStyle ? `Your most common style (${stats.topStyleCount}x)` : "No analyses yet"}
            </span>
          </div>
          <div className="card stat-card">
            <span className="stat-value">{stats.total > 0 ? `${stats.avgConfidence}%` : "—"}</span>
            <span className="stat-label">Average model confidence</span>
          </div>
          <div className="card stat-card">
            <span className="stat-value">
              {stats.lastDate ? new Date(stats.lastDate).toLocaleDateString() : "—"}
            </span>
            <span className="stat-label">Last analysis</span>
          </div>
        </div>
      )}

      {!loading && !error && analyses.length === 0 && (
        <div className="alert alert-error" role="alert">
          No analyses yet. <Link to="/upload">Upload a photo</Link> to get started - it'll show up here.
        </div>
      )}

      {analyses.length > 0 && (
        <>
          <h2 className="board-heading">Inspiration board</h2>
          <div className="board-grid">
            {analyses.map((item) => {
              const styleInfo = getStyleInfo(item.predicted_style);
              return (
                <article className="card card-hoverable board-card" key={item.id}>
                  {item.image_url && (
                    <img
                      src={`${API_BASE_URL}${item.image_url}`}
                      alt={`Uploaded photo classified as ${styleInfo.label}`}
                      className="board-card-image"
                    />
                  )}
                  <div className="board-card-body">
                    <h3>{styleInfo.label}</h3>
                    <p className="board-card-meta">
                      {Math.round(item.confidence * 100)}% confidence &middot;{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    <Link to={`/vendors/style/${item.predicted_style}`} className="btn-secondary">
                      See vendors
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
