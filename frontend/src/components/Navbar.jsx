import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import "./Navbar.css";

// In plain terms: the top navigation bar shown on most pages - shows
// different links depending on whether you're logged in or not.
//
// Simple shared nav bar. Uses <Link> (not <a href>) so navigation doesn't
// reload the page, and marks the active route with aria-current for both
// visual and screen-reader users.
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();

  const links = [
    { to: "/upload", label: "Upload" },
    { to: "/compare", label: "Compare Styles" },
    { to: "/vendors", label: "Vendors" },
  ];

  // Clears the session then sends the user to the landing page (rather than
  // leaving them on whatever page they logged out from, which may now
  // require auth - e.g. /profile).
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <Logo size={34} />
        </Link>
        <nav aria-label="Main navigation">
          <ul className="navbar-links">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={location.pathname.startsWith(link.to) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {isLoggedIn ? (
              <>
                <li>
                  <Link to="/profile" aria-current={location.pathname === "/profile" ? "page" : undefined}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <button type="button" className="navbar-logout" onClick={handleLogout}>
                    Log out{user?.display_name ? ` (${user.display_name})` : ""}
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" aria-current={location.pathname === "/login" ? "page" : undefined}>
                    Log in
                  </Link>
                </li>
                <li>
                  <Link to="/signup" aria-current={location.pathname === "/signup" ? "page" : undefined}>
                    Sign up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
